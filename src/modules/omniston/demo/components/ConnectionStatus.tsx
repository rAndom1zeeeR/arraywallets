import {
  type ConnectionStatus,
  useConnectionStatus,
  useOmniston,
} from "@ston-fi/omniston-sdk-react";

import { Badge } from "@/modules/omniston/demo/components/ui/badge";

export function ConnectionStatus() {
  const connectionStatus = useConnectionStatus();
  const omniston = useOmniston();

  return (
    <Badge
      key={connectionStatus}
      role="button"
      variant={getBadgeVariant(connectionStatus)}
      className="animate-in fade-in-0 zoom-in-95 max-w-22 truncate px-2 text-[10px] capitalize duration-200 sm:max-w-none sm:px-2.5 sm:text-xs"
      onClick={() => omniston.transport.reconnect()}
    >
      {connectionStatus}
    </Badge>
  );
}

function getBadgeVariant(connectionStatus: ConnectionStatus) {
  switch (connectionStatus) {
    case "connected":
      return "default";
    case "error":
      return "destructive";
    default:
      return "secondary";
  }
}
