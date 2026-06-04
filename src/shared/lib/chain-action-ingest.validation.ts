import { ChainActionDirection, ChainActionType } from "@/shared/api/prisma-client";

const TRANSFER_TYPES: ReadonlySet<ChainActionType> = new Set([
  ChainActionType.TON_TRANSFER,
  ChainActionType.JETTON_TRANSFER,
]);

export interface ChainActionIngestInput {
  type: ChainActionType;
  direction?: ChainActionDirection | null;
  walletAddress: string;
}

/**
 * Ensures transfer actions always have direction set relative to the wallet.
 */
export function assertChainActionIngestValid(input: ChainActionIngestInput): void {
  if (TRANSFER_TYPES.has(input.type) && input.direction == null) {
    throw new Error(
      `direction is required for ${input.type} actions (wallet=${input.walletAddress})`,
    );
  }
}
