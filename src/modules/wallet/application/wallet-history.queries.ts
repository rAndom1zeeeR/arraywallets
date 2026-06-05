import {
  ChainActionStatus,
  Prisma,
} from "@/shared/infrastructure/api/prisma-client";
import { prisma } from "@/shared/infrastructure/api/prisma";
import { EVENTS_PAGE_SIZE } from "@/modules/wallet/presentation/components/EventsPagination";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import { hasActionIndexGap } from "@/modules/wallet/domain/wallet-action-index.utils";
import {
  WALLET_HISTORY_FILTER_ALL,
  type WalletHistoryFilters,
  type WalletHistoryStatusFilter,
} from "@/modules/wallet/domain/wallet-events-filter.utils";
import { buildEventTimestampWhere } from "@/modules/wallet/domain/wallet-history-date.utils";
import { getWalletAddressVariants } from "@/shared/lib/ton/ton-address";

const CHAIN_ACTION_HISTORY_INCLUDE = {
  from: true,
  to: true,
  jetton: true,
  jettonIn: true,
  jettonOut: true,
  event: true,
} satisfies Prisma.ChainActionInclude;

type ChainActionHistoryRow = Prisma.ChainActionGetPayload<{
  include: typeof CHAIN_ACTION_HISTORY_INCLUDE;
}>;

const CHAIN_EVENT_HISTORY_INCLUDE = {
  actions: {
    include: {
      from: true,
      to: true,
      jetton: true,
      jettonIn: true,
      jettonOut: true,
    },
    orderBy: {
      orderIndex: "asc" as const,
    },
  },
} satisfies Prisma.ChainEventInclude;

export interface WalletHistoryPageResult {
  totalActions: number;
  totalPages: number;
  safePage: number;
  events: EventWithActions[];
}

function buildWalletAddressWhere(address: string): Prisma.ChainActionWhereInput {
  const walletVariants = getWalletAddressVariants(address);
  return { walletAddress: { in: walletVariants } };
}

function buildActionWhere(
  address: string,
  filters: WalletHistoryFilters
): Prisma.ChainActionWhereInput {
  const where: Prisma.ChainActionWhereInput = buildWalletAddressWhere(address);

  if (filters.actionType !== WALLET_HISTORY_FILTER_ALL) {
    where.type = filters.actionType;
  }

  if (
    filters.actionStatus !== WALLET_HISTORY_FILTER_ALL &&
    filters.actionStatus !== "incomplete" &&
    isChainActionStatusFilter(filters.actionStatus)
  ) {
    where.status = filters.actionStatus;
  }

  if (filters.direction !== WALLET_HISTORY_FILTER_ALL) {
    where.direction = filters.direction;
  }

  const eventTimestamp = buildEventTimestampWhere(filters);
  if (eventTimestamp) {
    where.event = { timestamp: eventTimestamp };
  }

  return where;
}

function isChainActionStatusFilter(
  value: WalletHistoryStatusFilter
): value is typeof ChainActionStatus.SUCCESS | typeof ChainActionStatus.FAILED | typeof ChainActionStatus.PENDING {
  return (
    value === ChainActionStatus.SUCCESS ||
    value === ChainActionStatus.FAILED ||
    value === ChainActionStatus.PENDING
  );
}

function mapActionRow(action: ChainActionHistoryRow): EventWithActions["actions"][number] {
  return {
    id: action.id,
    orderIndex: action.orderIndex,
    type: action.type,
    status: action.status,
    direction: action.direction,
    displayAmount: action.displayAmount,
    displayDetails: action.displayDetails,
    metadata: action.metadata,
    amount: action.amount,
    amountIn: action.amountIn,
    amountOut: action.amountOut,
    tonIn: action.tonIn,
    tonOut: action.tonOut,
    from: action.from,
    to: action.to,
    jetton: action.jetton,
    jettonIn: action.jettonIn,
    jettonOut: action.jettonOut,
  };
}

function mapEventShell(event: ChainActionHistoryRow["event"]): EventWithActions {
  return {
    id: event.id,
    tonEventId: event.tonEventId,
    timestamp: event.timestamp,
    lt: event.lt,
    isScam: event.isScam,
    inProgress: event.inProgress,
    extra: event.extra,
    rawData: event.rawData,
    actions: [],
  };
}

function groupActionsIntoEvents(actions: ChainActionHistoryRow[]): EventWithActions[] {
  const eventsById = new Map<string, EventWithActions>();
  const order: string[] = [];

  for (const row of actions) {
    let event = eventsById.get(row.event.id);
    if (!event) {
      event = mapEventShell(row.event);
      eventsById.set(row.event.id, event);
      order.push(row.event.id);
    }

    event.actions.push(mapActionRow(row));
  }

  return order.map(eventId => eventsById.get(eventId)!);
}

async function listIncompleteEventIds(
  address: string,
  filters: WalletHistoryFilters
): Promise<string[]> {
  const walletVariants = getWalletAddressVariants(address);
  const walletFilter = { walletAddress: { in: walletVariants } };
  const eventTimestamp = buildEventTimestampWhere(filters);
  const eventWhere = eventTimestamp ? { timestamp: eventTimestamp } : undefined;

  const [emptyEvents, actionGroups] = await Promise.all([
    prisma.chainEvent.findMany({
      where: {
        ...walletFilter,
        actions: { none: {} },
        ...(eventWhere ? eventWhere : {}),
      },
      select: { id: true, timestamp: true },
    }),
    prisma.chainAction.groupBy({
      by: ["eventId"],
      where: walletFilter,
      _count: { _all: true },
      _max: { orderIndex: true },
    }),
  ]);

  const gapEventIds = actionGroups
    .filter(group => hasActionIndexGap(group._count._all, group._max.orderIndex))
    .map(group => group.eventId);

  const gapEvents =
    gapEventIds.length === 0
      ? []
      : await prisma.chainEvent.findMany({
          where: {
            id: { in: gapEventIds },
            ...(eventWhere ? eventWhere : {}),
          },
          select: { id: true, timestamp: true },
        });

  const merged = [...emptyEvents, ...gapEvents];
  merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const uniqueIds: string[] = [];
  const seen = new Set<string>();
  for (const row of merged) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    uniqueIds.push(row.id);
  }

  return uniqueIds;
}

async function getIncompleteHistoryPage(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletHistoryPageResult> {
  const eventIds = await listIncompleteEventIds(address, filters);
  const totalActions = eventIds.length;
  const totalPages = Math.max(1, Math.ceil(totalActions / EVENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * EVENTS_PAGE_SIZE;
  const pageEventIds = eventIds.slice(skip, skip + EVENTS_PAGE_SIZE);

  if (pageEventIds.length === 0) {
    return { totalActions, totalPages, safePage, events: [] };
  }

  const events = await prisma.chainEvent.findMany({
    where: { id: { in: pageEventIds } },
    include: CHAIN_EVENT_HISTORY_INCLUDE,
    orderBy: { timestamp: "desc" },
  });

  const eventsById = new Map(events.map(event => [event.id, event]));
  const ordered = pageEventIds
    .map(id => eventsById.get(id))
    .filter((event): event is NonNullable<typeof event> => event !== undefined);

  return {
    totalActions,
    totalPages,
    safePage,
    events: ordered.map(event => ({
      id: event.id,
      tonEventId: event.tonEventId,
      timestamp: event.timestamp,
      lt: event.lt,
      isScam: event.isScam,
      inProgress: event.inProgress,
      extra: event.extra,
      rawData: event.rawData,
      actions: event.actions.map(action => ({
        id: action.id,
        orderIndex: action.orderIndex,
        type: action.type,
        status: action.status,
        direction: action.direction,
        displayAmount: action.displayAmount,
        displayDetails: action.displayDetails,
        metadata: action.metadata,
        amount: action.amount,
        amountIn: action.amountIn,
        amountOut: action.amountOut,
        tonIn: action.tonIn,
        tonOut: action.tonOut,
        from: action.from,
        to: action.to,
        jetton: action.jetton,
        jettonIn: action.jettonIn,
        jettonOut: action.jettonOut,
      })),
    })),
  };
}

async function getFilteredActionsHistoryPage(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletHistoryPageResult> {
  const where = buildActionWhere(address, filters);
  const safePageRequest = Math.max(page, 1);

  const [totalActions, actions] = await Promise.all([
    prisma.chainAction.count({ where }),
    prisma.chainAction.findMany({
      where,
      include: CHAIN_ACTION_HISTORY_INCLUDE,
      orderBy: [{ event: { timestamp: "desc" } }, { orderIndex: "asc" }],
      skip: (safePageRequest - 1) * EVENTS_PAGE_SIZE,
      take: EVENTS_PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalActions / EVENTS_PAGE_SIZE));
  const safePage = Math.min(safePageRequest, totalPages);

  return {
    totalActions,
    totalPages,
    safePage,
    events: groupActionsIntoEvents(actions),
  };
}

/**
 * Paginated wallet history with server-side filters applied across the full DB.
 */
export async function getWalletHistoryPage(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletHistoryPageResult> {
  if (filters.actionStatus === "incomplete") {
    return getIncompleteHistoryPage(address, page, filters);
  }

  return getFilteredActionsHistoryPage(address, page, filters);
}
