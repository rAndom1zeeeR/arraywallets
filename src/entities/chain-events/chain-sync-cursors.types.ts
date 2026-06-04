export interface ChainSyncCursors {
  afterLt: bigint | null;
  beforeLt: bigint | null;
  forwardScanDone: boolean;
}
