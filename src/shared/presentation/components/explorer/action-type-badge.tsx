import { ChainActionType, type ChainActionTypeValue } from "@/shared/constants/chain-prisma.enums";
import { cn } from "@/shared/lib/utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";

const ACTION_BADGE_STYLES: Record<ChainActionTypeValue, string> = {
  [ChainActionType.TON_TRANSFER]: "bg-explorer-tag-ton text-explorer-tag-ton-text",
  [ChainActionType.JETTON_TRANSFER]: "bg-explorer-tag-jetton text-explorer-tag-jetton-text",
  [ChainActionType.FLAWED_JETTON_TRANSFER]: "bg-explorer-tag-jetton text-explorer-tag-jetton-text",
  [ChainActionType.JETTON_SWAP]: "bg-explorer-tag-swap text-explorer-tag-swap-text",
  [ChainActionType.INFERRED_SWAP]: "bg-explorer-tag-swap text-explorer-tag-swap-text",
  [ChainActionType.JETTON_BURN]: "bg-explorer-tag-nft text-explorer-tag-nft-text",
  [ChainActionType.JETTON_MINT]: "bg-explorer-tag-nft text-explorer-tag-nft-text",
  [ChainActionType.SMART_CONTRACT_EXEC]: "bg-explorer-surface-2 text-muted-foreground",
  [ChainActionType.DEPOSIT_STAKE]: "bg-explorer-tag-ton text-explorer-tag-ton-text",
  [ChainActionType.WITHDRAW_STAKE]: "bg-explorer-tag-ton text-explorer-tag-ton-text",
  [ChainActionType.NFT_TRANSFER]: "bg-explorer-tag-nft text-explorer-tag-nft-text",
  [ChainActionType.NFT_MINT]: "bg-explorer-tag-nft text-explorer-tag-nft-text",
  [ChainActionType.NFT_SALE]: "bg-explorer-tag-nft text-explorer-tag-nft-text",
  [ChainActionType.SUBSCRIBE]: "bg-explorer-surface-2 text-muted-foreground",
  [ChainActionType.UNSUBSCRIBE]: "bg-explorer-surface-2 text-muted-foreground",
  [ChainActionType.AUCTION_BID]: "bg-explorer-surface-2 text-muted-foreground",
  [ChainActionType.DOMAIN_RENEW]: "bg-explorer-surface-2 text-muted-foreground",
  [ChainActionType.UNKNOWN]: "bg-explorer-surface-2 text-muted-foreground",
};

interface ActionTypeBadgeProps {
  type: ChainActionTypeValue | string;
  className?: string;
}

export const ActionTypeBadge = ({ type, className }: ActionTypeBadgeProps) => {
  const label = type.replace(/_/g, " ");
  const styleKey = type in ACTION_BADGE_STYLES ? (type as ChainActionTypeValue) : null;

  return (
    <span
      className={cn(
        explorerStyles.actionBadge,
        styleKey ? ACTION_BADGE_STYLES[styleKey] : "bg-explorer-surface-2 text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
};
