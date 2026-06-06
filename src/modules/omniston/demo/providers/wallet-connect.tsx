"use client";

import { createAppKit } from "@reown/appkit/react";
import { base, bsc, mainnet, polygon, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { injected } from "@wagmi/connectors";
import React, { useRef } from "react";
import { createConfig, http, type Config, WagmiProvider } from "wagmi";

let isAppKitCreated = false;

const networks = [mainnet, base, polygon, bsc] satisfies [AppKitNetwork, ...AppKitNetwork[]];

const ensureAppKit = (projectId: string, wagmiAdapter: WagmiAdapter): void => {
  if (isAppKitCreated || typeof window === "undefined") {
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    showWallets: true,
    defaultNetwork: base,
    themeMode: "light",
  });

  isAppKitCreated = true;
};

const createFallbackWagmiConfig = (): Config =>
  createConfig({
    chains: networks,
    connectors: [injected()],
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
      [polygon.id]: http(),
      [bsc.id]: http(),
    },
  });

export function WalletConnectProvider({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId?: string;
}) {
  const wagmiAdapter = useRef(
    projectId
      ? new WagmiAdapter({
          networks,
          projectId,
        })
      : null,
  );
  const fallbackConfig = useRef(projectId ? null : createFallbackWagmiConfig());

  if (projectId && wagmiAdapter.current) {
    ensureAppKit(projectId, wagmiAdapter.current);
  }

  const config = projectId ? wagmiAdapter.current!.wagmiConfig : fallbackConfig.current!;

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
