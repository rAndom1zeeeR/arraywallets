import "dotenv/config";
import { getWalletSwapStats } from "../src/modules/swap/application/swap-stats.service";
import { prisma } from "../src/shared/infrastructure/api/prisma";

const main = async (): Promise<void> => {
  const addressArg = process.argv[2];

  if (addressArg) {
    const stats = await getWalletSwapStats(addressArg);
    console.info(
      `PnL materialized for ${addressArg}: ${stats.aggregate.swapCount} swaps, ${stats.pnl.jettonLines.length} jetton rows`
    );
    return;
  }

  const wallets = await prisma.chainEvent.findMany({
    distinct: ["walletAddress"],
    select: { walletAddress: true },
  });

  let index = 0;

  for (const { walletAddress } of wallets) {
    index += 1;
    const stats = await getWalletSwapStats(walletAddress);
    console.info(
      `[${index}/${wallets.length}] ${walletAddress}: ${stats.aggregate.swapCount} swaps, ${stats.pnl.jettonLines.length} jettons`
    );
  }
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
