import { buildTonviewerAccountUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";

interface TonviewerAccountLinkProps {
  address: string;
  label: string;
  className?: string;
}

export function TonviewerAccountLink({
  address,
  label,
  className = "font-mono text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300",
}: TonviewerAccountLinkProps) {
  const href = buildTonviewerAccountUrl(address, tonapiBaseUrl);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={address}
    >
      {label}
    </a>
  );
}
