import {
  formatEventDateTimeFull,
  formatEventTime24h,
} from "@/modules/wallet/domain/wallet-event-display.utils";
import { cn } from "@/shared/lib/utils";

interface EventTimeLabelProps {
  timestamp: string | Date;
  className?: string;
}

/**
 * Compact 24-hour time with full datetime (incl. seconds) on hover.
 */
export function EventTimeLabel({ timestamp, className }: EventTimeLabelProps) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return (
    <time
      dateTime={date.toISOString()}
      title={formatEventDateTimeFull(date)}
      className={cn("tabular-nums", className)}
    >
      {formatEventTime24h(date)}
    </time>
  );
}
