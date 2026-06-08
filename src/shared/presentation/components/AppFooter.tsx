import Link from "next/link";
import { Send } from "lucide-react";

const TELEGRAM_CHANNEL_URL = "https://t.me/arrayTon";

/**
 * Site-wide footer with community links.
 */
export const AppFooter = () => {
  return (
    <footer className="mt-auto border-t border-border bg-explorer-surface px-4 py-4 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} ArrayWallets</p>

        <Link
          href={TELEGRAM_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
          aria-label="ArrayTon Telegram channel"
        >
          <Send className="size-4" aria-hidden />
          @arrayTon
        </Link>
      </div>
    </footer>
  );
};
