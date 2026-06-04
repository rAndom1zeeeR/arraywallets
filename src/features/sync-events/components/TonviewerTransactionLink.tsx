import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";

interface TonviewerTransactionLinkProps {
  tonEventId: string;
  rawData: unknown;
  className?: string;
}

export function TonviewerTransactionLink({
  tonEventId,
  rawData,
  className = "text-xs font-medium text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300",
}: TonviewerTransactionLinkProps) {
  const href = buildTonviewerTransactionUrl(tonEventId, rawData, tonapiBaseUrl);

  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="Открыть транзакцию в Tonviewer"
    >
      Tonviewer ↗
    </a>
  );
}
