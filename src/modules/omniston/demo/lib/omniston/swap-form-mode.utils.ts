import type { AssetId } from "@ston-fi/omniston-sdk-react";

import { Chain } from "@/modules/omniston/demo/models/chain";
import { isAssetIdEqual, normalizeAssetId } from "@/modules/omniston/demo/models/asset-id";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import {
  getOmnistonDefaultInputAssetIdForOutput,
  getOmnistonDefaultOutputAssetIdForInput,
  getOmnistonSupportedAssetIdForChain,
  isOmnistonSupportedAssetId,
  OMNISTON_DEFAULT_INPUT_ASSET_ID,
} from "@/modules/omniston/omniston-supported-assets.constants";

export interface SwapFormState {
  inputAssetId: AssetId | null;
  inputUnits: string;
  outputAssetId: AssetId | null;
  outputUnits: string;
}

export const TON_NATIVE_ASSET_ID: AssetId = {
  chain: {
    $case: Chain.TON,
    value: { kind: { $case: "native", value: {} } },
  },
};

/** Builds a TON jetton {@link AssetId} from a jetton master contract address. */
export function buildTonJettonAssetId(jettonAddress: string): AssetId {
  return normalizeAssetId({
    chain: {
      $case: Chain.TON,
      value: {
        kind: {
          $case: "jetton",
          value: jettonAddress,
        },
      },
    },
  });
}

/** Preset swap form state: jetton → native TON. */
export function buildJettonToTonSwapFormState(jettonAddress: string): SwapFormState {
  return sanitizeTonSwapFormState({
    inputAssetId: buildTonJettonAssetId(jettonAddress),
    inputUnits: "",
    outputAssetId: TON_NATIVE_ASSET_ID,
    outputUnits: "",
  });
}

export function getTonUsdtAssetId(): AssetId {
  return getOmnistonSupportedAssetIdForChain(Chain.TON) ?? TON_NATIVE_ASSET_ID;
}

export function isTonChainAssetId(assetId: AssetId | null | undefined): boolean {
  return assetId?.chain.$case === Chain.TON;
}

/** TON intrachain swap tab default: native TON → USD₮ jetton. */
export const OMNISTON_TON_SWAP_DEFAULT_STATE: SwapFormState = {
  inputAssetId: TON_NATIVE_ASSET_ID,
  inputUnits: "",
  outputAssetId: getTonUsdtAssetId(),
  outputUnits: "",
};

export function getDefaultSwapFormState(mode: OmnistonMode): SwapFormState {
  if (mode === OmnistonMode.TRANSFER) {
    return {
      inputAssetId: OMNISTON_DEFAULT_INPUT_ASSET_ID,
      inputUnits: "",
      outputAssetId: getOmnistonDefaultOutputAssetIdForInput(OMNISTON_DEFAULT_INPUT_ASSET_ID),
      outputUnits: "",
    };
  }

  return { ...OMNISTON_TON_SWAP_DEFAULT_STATE };
}

export function sanitizeTransferFormState(state: SwapFormState): SwapFormState {
  let inputAssetId = isOmnistonSupportedAssetId(state.inputAssetId)
    ? state.inputAssetId
    : OMNISTON_DEFAULT_INPUT_ASSET_ID;

  let outputAssetId = isOmnistonSupportedAssetId(state.outputAssetId)
    ? state.outputAssetId
    : getOmnistonDefaultOutputAssetIdForInput(inputAssetId);

  const isSameChain =
    inputAssetId !== null &&
    outputAssetId !== null &&
    inputAssetId.chain.$case === outputAssetId.chain.$case;

  if (outputAssetId === null || isAssetIdEqual(inputAssetId, outputAssetId) || isSameChain) {
    outputAssetId = getOmnistonDefaultOutputAssetIdForInput(inputAssetId);
  }

  if (
    inputAssetId !== null &&
    outputAssetId !== null &&
    inputAssetId.chain.$case === outputAssetId.chain.$case
  ) {
    inputAssetId = getOmnistonDefaultInputAssetIdForOutput(outputAssetId);
  }

  return {
    ...state,
    inputAssetId,
    outputAssetId,
  };
}

export function sanitizeTonSwapFormState(state: SwapFormState): SwapFormState {
  let inputAssetId = isTonChainAssetId(state.inputAssetId)
    ? state.inputAssetId
    : TON_NATIVE_ASSET_ID;

  let outputAssetId = isTonChainAssetId(state.outputAssetId)
    ? state.outputAssetId
    : getTonUsdtAssetId();

  if (inputAssetId !== null && isAssetIdEqual(inputAssetId, outputAssetId)) {
    outputAssetId =
      inputAssetId.chain.value.kind.$case === "native" ? getTonUsdtAssetId() : TON_NATIVE_ASSET_ID;
  }

  return {
    ...state,
    inputAssetId,
    outputAssetId,
  };
}

export function sanitizeSwapFormStateForMode(
  state: SwapFormState,
  mode: OmnistonMode,
): SwapFormState {
  if (mode === OmnistonMode.TRANSFER) {
    return sanitizeTransferFormState(state);
  }

  return sanitizeTonSwapFormState(state);
}

export function getSwapFormStorageKey(mode: OmnistonMode): string {
  return mode === OmnistonMode.TRANSFER
    ? "@ton-wallets/omnistone-transfer-form"
    : "@ton-wallets/omnistone-ton-swap-form";
}
