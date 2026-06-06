export const OmnistonMode = {
  TRANSFER: "transfer",
  SWAP: "swap",
} as const;

export type OmnistonMode = (typeof OmnistonMode)[keyof typeof OmnistonMode];
