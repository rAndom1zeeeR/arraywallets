import { Address } from "@ton/core";
import { prisma } from "@/shared/api/prisma";
import { SyncButton } from "@/features/sync-events/components/SyncButton";
import {
  EventsPagination,
  EVENTS_PAGE_SIZE,
} from "@/features/sync-events/components/EventsPagination";
import { getWalletStats } from "@/features/sync-events/model/sync-service";
import {
  normalizeWalletAddress,
  getWalletAddressVariants,
} from "@/shared/lib/ton-address";
import type { ChainEvent, ChainAction, ChainAddress, ChainJetton } from "@generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const DEFAULT_ADDRESS = "EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl";

type EventWithActions = ChainEvent & {
  actions: (ChainAction & {
    from: ChainAddress | null;
    to: ChainAddress | null;
    jetton: ChainJetton | null;
    jettonIn: ChainJetton | null;
    jettonOut: ChainJetton | null;
  })[];
};

function parsePageParam(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? value : undefined;
  if (!raw) {
    return 1;
  }

  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return page;
}

async function getEventsCount(address: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(address);

  return prisma.chainEvent.count({
    where: {
      walletAddress: { in: walletVariants },
    },
  });
}

async function getEvents(
  address: string,
  page: number
): Promise<EventWithActions[]> {
  const walletVariants = getWalletAddressVariants(address);
  const skip = (page - 1) * EVENTS_PAGE_SIZE;

  return prisma.chainEvent.findMany({
    where: {
      walletAddress: { in: walletVariants },
    },
    include: {
      actions: {
        include: {
          from: true,
          to: true,
          jetton: true,
          jettonIn: true,
          jettonOut: true,
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: EVENTS_PAGE_SIZE,
    skip,
  });
}

async function getSyncState(address: string) {
  const normalized = normalizeWalletAddress(address);

  return prisma.chainSyncState.findUnique({
    where: { walletAddress: normalized },
  });
}

function formatAddress(addr: string | null | undefined, maxLength: number = 16): string {
  if (!addr) return "—";
  if (addr.length <= maxLength) return addr;
  const half = Math.floor(maxLength / 2) - 1;
  return `${addr.slice(0, half)}…${addr.slice(-half)}`;
}

function getDirectionBadge(direction: string | null | undefined) {
  if (!direction) return null;

  const styles: Record<string, string> = {
    INCOMING: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    OUTGOING: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    SELF: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    UNKNOWN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const labels: Record<string, string> = {
    INCOMING: "← In",
    OUTGOING: "→ Out",
    SELF: "↻ Self",
    UNKNOWN: "?",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[direction] ?? styles.unknown}`}>
      {labels[direction] ?? direction}
    </span>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const addressParam = typeof params.address === "string" ? params.address : DEFAULT_ADDRESS;

  let address: Address;
  try {
    address = Address.parse(addressParam);
  } catch {
    return (
      <main className="p-4">
        <h1 className="text-2xl font-bold mb-4">TON Wallet Transactions</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Invalid TON address: {addressParam}
        </div>
      </main>
    );
  }

  const addressString = normalizeWalletAddress(address.toString());
  const currentPage = parsePageParam(params.page);

  const [totalEvents, syncState, stats] = await Promise.all([
    getEventsCount(addressString),
    getSyncState(addressString),
    getWalletStats(addressString),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalEvents / EVENTS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const events = await getEvents(addressString, safePage);

  const isSyncing = syncState?.status === "syncing";

  return (
    <main className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">TON Wallet Transactions</h1>
        <SyncButton address={addressString} isSyncing={isSyncing} />
      </div>

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-gray-500">Address:</span>
            <code className="ml-2 text-sm font-mono">{addressString}</code>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            DB: <strong>{stats.events}</strong> events, <strong>{stats.actions}</strong> actions
          </span>
          {stats.incompleteEvents > 0 && (
            <span className="text-red-600">
              Incomplete: {stats.incompleteEvents} (нажми Sync с repair)
            </span>
          )}
          {syncState && (
            <>
              <span>
                Status:{" "}
                <span className={`font-medium ${
                  syncState.status === "completed" ? "text-green-600" :
                  syncState.status === "error" ? "text-red-600" :
                  syncState.status === "syncing" ? "text-blue-600" :
                  "text-gray-600"
                }`}>
                  {syncState.status}
                </span>
              </span>
              {syncState.actionsSynced !== undefined && (
                <span>Last sync actions: {syncState.actionsSynced}</span>
              )}
              {syncState.lastTimestamp && (
                <span>
                  Last sync: {new Date(syncState.lastTimestamp).toLocaleString()}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {totalEvents > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalEvents={totalEvents}
          address={addressString}
        />
      )}

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No events found in database.</p>
          <p className="text-sm text-gray-400">
            Click &quot;Sync&quot; to fetch transactions from TON API.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-sm font-medium">Date</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Type</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Direction</th>
                <th className="px-3 py-2 text-left text-sm font-medium">From / To</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event: EventWithActions) => (
                event.actions.map((tx: EventWithActions["actions"][number], txIndex: number) => (
                  <tr
                    key={`${event.id}-${tx.id}`}
                    className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                      txIndex === 0 ? "" : "border-t border-dashed"
                    }`}
                  >
                    {txIndex === 0 && (
                      <td className="px-3 py-2 text-sm" rowSpan={event.actions.length}>
                        <div className="font-medium">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tx.type === "TON_TRANSFER" ? "bg-blue-100 text-blue-800" :
                        tx.type === "JETTON_TRANSFER" ? "bg-purple-100 text-purple-800" :
                        tx.type === "JETTON_SWAP" ? "bg-orange-100 text-orange-800" :
                        tx.type === "JETTON_BURN" ? "bg-red-100 text-red-800" :
                        tx.type === "JETTON_MINT" ? "bg-green-100 text-green-800" :
                        tx.type === "DEPOSIT_STAKE" ? "bg-teal-100 text-teal-800" :
                        tx.type === "WITHDRAW_STAKE" ? "bg-cyan-100 text-cyan-800" :
                        tx.type === "SMART_CONTRACT_EXEC" ? "bg-gray-100 text-gray-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {tx.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {getDirectionBadge(tx.direction)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="space-y-1">
                        {tx.from && (
                          <div className="text-xs">
                            <span className="text-gray-500">From: </span>
                            <span className="font-mono" title={tx.from.rawAddress}>
                              {formatAddress(tx.from.rawAddress, 12)}
                            </span>
                            {tx.from.name && (
                              <span className="ml-1 text-gray-600">({tx.from.name})</span>
                            )}
                          </div>
                        )}
                        {tx.to && (
                          <div className="text-xs">
                            <span className="text-gray-500">To: </span>
                            <span className="font-mono" title={tx.to.rawAddress}>
                              {formatAddress(tx.to.rawAddress, 12)}
                            </span>
                            {tx.to.name && (
                              <span className="ml-1 text-gray-600">({tx.to.name})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {tx.displayAmount ? (
                        <span className={`font-medium ${
                          tx.direction === "INCOMING" ? "text-green-600" :
                          tx.direction === "OUTGOING" ? "text-red-600" :
                          ""
                        }`}>
                          {tx.direction === "INCOMING" ? "+" : tx.direction === "OUTGOING" ? "-" : ""}
                          {tx.displayAmount}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {tx.displayDetails && (
                        <div className="text-xs text-gray-600 max-w-xs truncate" title={tx.displayDetails}>
                          {tx.displayDetails}
                        </div>
                      )}
                      {tx.metadata && typeof tx.metadata === "object" && "comment" in tx.metadata && tx.metadata.comment && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={String(tx.metadata.comment)}>
                          💬 {String(tx.metadata.comment)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalEvents > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalEvents={totalEvents}
          address={addressString}
        />
      )}
    </main>
  );
}
