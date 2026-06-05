import "dotenv/config";
import { prisma } from "../src/shared/infrastructure/api/prisma";
import { toRawTonAddress } from "../src/shared/lib/ton/ton-address";

const normalizeDistinct = async (
  label: string,
  fetchDistinct: () => Promise<string[]>,
  update: (from: string, to: string) => Promise<number>
): Promise<number> => {
  const distinct = await fetchDistinct();
  let updated = 0;

  for (const address of distinct) {
    const raw = toRawTonAddress(address);
    if (raw === address) {
      continue;
    }

    const count = await update(address, raw);
    updated += count;
    console.info(`[${label}] ${address} -> ${raw} (${count} rows)`);
  }

  return updated;
};

const mergeChainSyncStates = async (): Promise<void> => {
  const rows = await prisma.chainSyncState.findMany();
  const groups = new Map<string, typeof rows>();

  for (const row of rows) {
    const raw = toRawTonAddress(row.walletAddress);
    const group = groups.get(raw) ?? [];
    group.push(row);
    groups.set(raw, group);
  }

  for (const [raw, group] of groups) {
    if (group.length <= 1) {
      if (group[0] && group[0].walletAddress !== raw) {
        await prisma.chainSyncState.update({
          where: { id: group[0].id },
          data: { walletAddress: raw },
        });
      }
      continue;
    }

    const [keeper, ...duplicates] = group.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const mergedLastLt =
      group
        .map(row => row.lastLt)
        .filter((lt): lt is NonNullable<typeof keeper.lastLt> => lt != null)
        .sort((a, b) => (a.gt(b) ? -1 : 1))[0] ?? keeper.lastLt;

    const mergedLastTimestamp =
      group
        .map(row => row.lastTimestamp)
        .filter((ts): ts is Date => ts != null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? keeper.lastTimestamp;

    await prisma.chainSyncState.update({
      where: { id: keeper.id },
      data: {
        walletAddress: raw,
        lastLt: mergedLastLt,
        lastTimestamp: mergedLastTimestamp,
        eventsSynced: group.reduce((sum, row) => sum + row.eventsSynced, 0),
        actionsSynced: group.reduce((sum, row) => sum + row.actionsSynced, 0),
      },
    });

    await prisma.chainSyncState.deleteMany({
      where: { id: { in: duplicates.map(row => row.id) } },
    });

    console.info(`[chain_sync_state] merged ${group.length} rows into ${raw}`);
  }
};

const mergeChainAddresses = async (): Promise<void> => {
  const rows = await prisma.chainAddress.findMany();
  const groups = new Map<string, typeof rows>();

  for (const row of rows) {
    const raw = toRawTonAddress(row.rawAddress);
    const group = groups.get(raw) ?? [];
    group.push(row);
    groups.set(raw, group);
  }

  for (const [raw, group] of groups) {
    if (group.length <= 1) {
      if (group[0] && group[0].rawAddress !== raw) {
        await prisma.chainAddress.update({
          where: { id: group[0].id },
          data: { rawAddress: raw },
        });
      }
      continue;
    }

    const [keeper, ...duplicates] = group.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    for (const duplicate of duplicates) {
      await prisma.chainAction.updateMany({
        where: { fromId: duplicate.id },
        data: { fromId: keeper.id },
      });
      await prisma.chainAction.updateMany({
        where: { toId: duplicate.id },
        data: { toId: keeper.id },
      });
      await prisma.chainAddress.delete({ where: { id: duplicate.id } });
    }

    if (keeper.rawAddress !== raw) {
      await prisma.chainAddress.update({
        where: { id: keeper.id },
        data: { rawAddress: raw },
      });
    }

    console.info(`[chain_address] merged ${group.length} rows into ${raw}`);
  }
};

const mergeChainJettons = async (): Promise<void> => {
  const rows = await prisma.chainJetton.findMany();
  const groups = new Map<string, typeof rows>();

  for (const row of rows) {
    const raw = toRawTonAddress(row.address);
    const group = groups.get(raw) ?? [];
    group.push(row);
    groups.set(raw, group);
  }

  for (const [raw, group] of groups) {
    if (group.length <= 1) {
      if (group[0] && group[0].address !== raw) {
        await prisma.chainJetton.update({
          where: { id: group[0].id },
          data: { address: raw },
        });
      }
      continue;
    }

    const [keeper, ...duplicates] = group;

    for (const duplicate of duplicates) {
      await prisma.chainAction.updateMany({
        where: { jettonId: duplicate.id },
        data: { jettonId: keeper.id },
      });
      await prisma.chainAction.updateMany({
        where: { jettonInId: duplicate.id },
        data: { jettonInId: keeper.id },
      });
      await prisma.chainAction.updateMany({
        where: { jettonOutId: duplicate.id },
        data: { jettonOutId: keeper.id },
      });
      await prisma.chainJetton.delete({ where: { id: duplicate.id } });
    }

    if (keeper.address !== raw) {
      await prisma.chainJetton.update({
        where: { id: keeper.id },
        data: { address: raw },
      });
    }

    console.info(`[chain_jetton] merged ${group.length} rows into ${raw}`);
  }
};

const main = async (): Promise<void> => {
  await mergeChainSyncStates();
  await mergeChainAddresses();
  await mergeChainJettons();

  const eventUpdates = await normalizeDistinct(
    "chain_event",
    () =>
      prisma.chainEvent
        .findMany({ select: { walletAddress: true }, distinct: ["walletAddress"] })
        .then(rows => rows.map(row => row.walletAddress)),
    async (from, to) =>
      (
        await prisma.chainEvent.updateMany({
          where: { walletAddress: from },
          data: { walletAddress: to },
        })
      ).count
  );

  const rawEventUpdates = await normalizeDistinct(
    "chain_raw_event",
    () =>
      prisma.chainRawEvent
        .findMany({ select: { walletAddress: true }, distinct: ["walletAddress"] })
        .then(rows => rows.map(row => row.walletAddress)),
    async (from, to) =>
      (
        await prisma.chainRawEvent.updateMany({
          where: { walletAddress: from },
          data: { walletAddress: to },
        })
      ).count
  );

  console.info(`Done. Updated rows: events=${eventUpdates}, raw_events=${rawEventUpdates}`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
