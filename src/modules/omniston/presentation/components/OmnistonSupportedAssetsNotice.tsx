import { OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS } from "@/modules/omniston/omniston-supported-assets.constants";
import { CHAIN_METADATA } from "@/modules/omniston/demo/models/chain";
import { cn } from "@/shared/lib/utils";

interface OmnistonSupportedAssetsNoticeProps {
  className?: string;
}

/**
 * Explains which assets Omniston cross-chain routing supports at this stage.
 */
export const OmnistonSupportedAssetsNotice = ({ className }: OmnistonSupportedAssetsNoticeProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-foreground",
        className,
      )}
      role="note"
    >
      <p className="font-medium text-sky-800 dark:text-sky-200">Cross-chain: USD stablecoins only</p>
      <p className="mt-1 text-muted-foreground">
        Omniston currently routes swaps between these assets. Other tokens are not available yet.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.map((asset) => (
          <li
            key={asset.label}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <img
              src={CHAIN_METADATA[asset.chain].imageUrl}
              alt=""
              width={14}
              height={14}
              className="size-3.5 shrink-0 rounded-full"
            />
            <span className="font-medium">{asset.symbol}</span>
            <span className="text-muted-foreground">{CHAIN_METADATA[asset.chain].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
