"use client";

import { useTonConnectUI } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";

type TonConnectUi = NonNullable<ReturnType<typeof useTonConnectUI>[0]>;

const isTonConnectOverlayOpen = (tonConnectUI: TonConnectUi | null): boolean => {
  if (!tonConnectUI) {
    return false;
  }

  return (
    tonConnectUI.modalState.status === "opened" ||
    tonConnectUI.singleWalletModalState.status === "opened"
  );
};

const isTonConnectDomTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      '[data-tc-modal="true"], [data-tc-wallets-modal-container="true"], [data-tc-actions-modal-container="true"]',
    ),
  );
};

/**
 * Tracks TonConnect wallet / action modals so nested Radix dialogs can release focus trap.
 */
export const useTonConnectModalOpen = (): boolean => {
  const [tonConnectUI] = useTonConnectUI();
  const [isOpen, setIsOpen] = useState(() => isTonConnectOverlayOpen(tonConnectUI));

  useEffect(() => {
    if (!tonConnectUI) {
      return;
    }

    const sync = () => {
      setIsOpen(isTonConnectOverlayOpen(tonConnectUI));
    };

    const unsubscribeModal = tonConnectUI.onModalStateChange(sync);
    const unsubscribeSingleWallet = tonConnectUI.onSingleWalletModalStateChange(sync);

    return () => {
      unsubscribeModal();
      unsubscribeSingleWallet();
    };
  }, [tonConnectUI]);

  return isOpen;
};

export { isTonConnectDomTarget };
