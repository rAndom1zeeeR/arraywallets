import type { EventWithActions, WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";

export interface WalletEventFlatRow {
  rowKey: string;
  event: EventWithActions;
  action: WalletEventActionRow;
  isFirstActionInEvent: boolean;
  eventActionCount: number;
}

export function flattenEvents(events: EventWithActions[]): WalletEventFlatRow[] {
  return events.flatMap(event =>
    event.actions.map((action, index) => ({
      rowKey: `${event.id}-${action.id}`,
      event,
      action,
      isFirstActionInEvent: index === 0,
      eventActionCount: event.actions.length,
    }))
  );
}

export function buildEventRowSpanMeta<T extends { original: WalletEventFlatRow }>(
  rows: T[]
): Map<string, { isFirst: boolean; count: number; index: number }> {
  const meta = new Map<string, { isFirst: boolean; count: number; index: number }>();
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const eventId = row.original.event.id;
    const group = groups.get(eventId) ?? [];
    group.push(row);
    groups.set(eventId, group);
  }

  for (const group of groups.values()) {
    group.forEach((row, index) => {
      meta.set(row.original.rowKey, {
        isFirst: index === 0,
        count: group.length,
        index,
      });
    });
  }

  return meta;
}
