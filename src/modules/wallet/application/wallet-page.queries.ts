import { prisma } from "@/shared/infrastructure/api/prisma";
import { EVENTS_PAGE_SIZE } from "@/modules/wallet/presentation/components/EventsPagination";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import { getWalletAddressVariants } from "@/shared/lib/ton/ton-address";

export type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";

export async function getEventsCount(address: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(address);

  return prisma.chainEvent.count({
    where: {
      walletAddress: { in: walletVariants },
    },
  });
}

export async function getEvents(address: string, page: number): Promise<EventWithActions[]> {
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

export async function getSyncState(address: string) {
  const walletVariants = getWalletAddressVariants(address);

  return prisma.chainSyncState.findFirst({
    where: { walletAddress: { in: walletVariants } },
  });
}
