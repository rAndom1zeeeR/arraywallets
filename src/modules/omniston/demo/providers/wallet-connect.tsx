"use client";

import { createAppKit } from "@reown/appkit/react";
import { base, bsc, mainnet, polygon, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { injected } from "@wagmi/connectors";
import React, { useEffect, useRef } from "react";
import { createConfig, http, type Config, WagmiProvider } from "wagmi";

let isAppKitCreated = false;

const networks = [mainnet, base, polygon, bsc] satisfies [AppKitNetwork, ...AppKitNetwork[]];

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

  useEffect(() => {
    if (!projectId || isAppKitCreated) return;

    createAppKit({
      adapters: [wagmiAdapter.current!],
      networks,
      projectId,
      showWallets: true,
      defaultNetwork: base,
      themeMode: "light",
    });

    isAppKitCreated = true;
  }, [projectId]);

  const config = projectId ? wagmiAdapter.current!.wagmiConfig : fallbackConfig.current!;

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
