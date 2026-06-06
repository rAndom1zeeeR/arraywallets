"use client";



import { useQuery } from "@tanstack/react-query";

import {

  createContext,

  type Dispatch,

  useContext,

  useEffect,

  useMemo,

  useReducer,

  useRef,

} from "react";

import { z } from "zod";

import type { AssetId } from "@ston-fi/omniston-sdk-react";



import { Chain } from "@/modules/omniston/demo/models/chain";

import { assetIdSchema, isAssetIdEqual, serializeAssetId } from "@/modules/omniston/demo/models/asset-id";

import { useAssets } from "@/modules/omniston/demo/providers/assets";

import {

  getDefaultSwapFormState,

  getSwapFormStorageKey,

  isTonChainAssetId,

  OMNISTON_TON_SWAP_DEFAULT_STATE,

  sanitizeSwapFormStateForMode,

  type SwapFormState,

} from "@/modules/omniston/demo/lib/omniston/swap-form-mode.utils";

import { isOmnistonSupportedAssetId } from "@/modules/omniston/omniston-supported-assets.constants";

import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";

import { useOmnistonMode } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";



const swapFormSchema = z.object({

  inputAssetId: assetIdSchema.nullable(),

  inputUnits: z.string().catch(""),

  outputAssetId: assetIdSchema.nullable(),

  outputUnits: z.string().catch(""),

});



type SwapState = SwapFormState;



type IAction =

  | {

      type: "SET_INPUT_ASSET_ID" | "SET_OUTPUT_ASSET_ID";

      payload: AssetId | null;

    }

  | {

      type: "SET_INPUT_UNITS" | "SET_OUTPUT_UNITS";

      payload: SwapState["inputUnits"] | SwapState["outputUnits"];

    }

  | {

      type: "SYNC_OUTPUT_FROM_QUOTE" | "SYNC_INPUT_FROM_QUOTE";

      payload: SwapState["inputUnits"] | SwapState["outputUnits"];

    }

  | {

      type: "INITIALIZE_FROM_STORAGE";

      payload: SwapState;

    }

  | {

      type: "FLIP_ASSETS";

    };



const SwapContext = createContext<SwapState>(getDefaultSwapFormState(OmnistonMode.TRANSFER));

const SwapContextDispatch = createContext<Dispatch<IAction>>(() => {});



const swapReducer = (state: SwapState, action: IAction, mode: OmnistonMode): SwapState => {

  const sanitize = (next: SwapState) => sanitizeSwapFormStateForMode(next, mode);

  const isValidAsset =

    mode === OmnistonMode.TRANSFER ? isOmnistonSupportedAssetId : isTonChainAssetId;



  if (action.type === "SET_INPUT_ASSET_ID") {

    const inputAssetId = assetIdSchema.safeParse(action.payload);



    if (!inputAssetId.success || !isValidAsset(inputAssetId.data)) {

      return state;

    }



    if (mode === OmnistonMode.SWAP) {

      const shouldResetOutput = isAssetIdEqual(state.outputAssetId, inputAssetId.data);



      return sanitize({

        ...state,

        inputAssetId: inputAssetId.data,

        outputAssetId: shouldResetOutput ? null : state.outputAssetId,

        outputUnits: shouldResetOutput ? "" : state.outputUnits,

      });

    }



    const inputChain = inputAssetId.data.chain.$case;

    const outputOnSameChain = state.outputAssetId?.chain.$case === inputChain;

    const shouldResetOutput =

      isAssetIdEqual(state.outputAssetId, action.payload) || outputOnSameChain;



    return sanitize({

      ...state,

      inputAssetId: inputAssetId.data,

      outputAssetId: shouldResetOutput ? null : state.outputAssetId,

      outputUnits: shouldResetOutput ? "" : state.outputUnits,

    });

  }



  if (action.type === "SET_OUTPUT_ASSET_ID") {

    const outputAssetId = assetIdSchema.safeParse(action.payload);



    if (!outputAssetId.success || !isValidAsset(outputAssetId.data)) {

      return state;

    }



    if (mode === OmnistonMode.SWAP) {

      const shouldResetInput = isAssetIdEqual(state.inputAssetId, outputAssetId.data);



      return sanitize({

        ...state,

        inputAssetId: shouldResetInput ? null : state.inputAssetId,

        inputUnits: shouldResetInput ? "" : state.inputUnits,

        outputAssetId: outputAssetId.data,

      });

    }



    const outputChain = outputAssetId.data.chain.$case;

    const inputOnSameChain = state.inputAssetId?.chain.$case === outputChain;



    if (inputOnSameChain) {

      return sanitize({

        ...state,

        inputAssetId: null,

        inputUnits: "",

        outputAssetId: outputAssetId.data,

      });

    }



    return sanitize({ ...state, outputAssetId: outputAssetId.data });

  }



  if (action.type === "SET_INPUT_UNITS") {

    return { ...state, inputUnits: action.payload, outputUnits: "" };

  }



  if (action.type === "SET_OUTPUT_UNITS") {

    return { ...state, outputUnits: action.payload, inputUnits: "" };

  }



  if (action.type === "SYNC_OUTPUT_FROM_QUOTE") {

    return { ...state, outputUnits: action.payload };

  }



  if (action.type === "SYNC_INPUT_FROM_QUOTE") {

    return { ...state, inputUnits: action.payload };

  }



  if (action.type === "FLIP_ASSETS") {

    return sanitize({

      ...state,

      inputAssetId: state.outputAssetId,

      outputAssetId: state.inputAssetId,

      inputUnits: state.outputUnits,

      outputUnits: state.inputUnits,

    });

  }



  if (action.type === "INITIALIZE_FROM_STORAGE") {

    return sanitize(action.payload);

  }



  return state;

};



function SwapFormAssetHydrator() {

  const { inputAssetId, outputAssetId } = useSwapForm();

  const { populateAssets } = useAssets();



  const tonJettonsToPopulate = useMemo(() => {

    const assetIds = [inputAssetId, outputAssetId].filter(

      (assetId): assetId is AssetId => assetId !== null,

    );



    return assetIds.filter(

      (assetId) =>

        assetId.chain.$case === Chain.TON && assetId.chain.value.kind.$case === "jetton",

    );

  }, [inputAssetId, outputAssetId]);



  useQuery({

    queryKey: ["swapFormAssets", ...tonJettonsToPopulate.map(serializeAssetId)],

    queryFn: () => populateAssets(tonJettonsToPopulate).then(() => null),

    enabled: tonJettonsToPopulate.length > 0,

    retry: 2,

    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),

  });



  return null;

}



function loadStoredFormState(mode: OmnistonMode): SwapState {

  try {

    const stored = localStorage.getItem(getSwapFormStorageKey(mode));



    if (!stored) {

      return getDefaultSwapFormState(mode);

    }



    const parsed = swapFormSchema.safeParse(JSON.parse(stored));



    if (!parsed.success) {

      return getDefaultSwapFormState(mode);

    }



    return sanitizeSwapFormStateForMode(parsed.data, mode);

  } catch {

    return getDefaultSwapFormState(mode);

  }

}



interface SwapFormProviderProps extends React.PropsWithChildren {
  initialState?: SwapState;
  persist?: boolean;
}

export const SwapFormProvider = ({
  children,
  initialState,
  persist = true,
}: SwapFormProviderProps) => {
  const { mode } = useOmnistonMode();

  const [state, rawDispatch] = useReducer(
    (current: SwapState, action: IAction) => swapReducer(current, action, mode),
    initialState ?? getDefaultSwapFormState(mode),
  );

  const hydrated = useRef(false);

  const prevMode = useRef(mode);



  const dispatch: Dispatch<IAction> = rawDispatch;



  useEffect(() => {

    if (!hydrated.current) {

      const payload =
        initialState ?? (persist ? loadStoredFormState(mode) : getDefaultSwapFormState(mode));

      dispatch({
        type: "INITIALIZE_FROM_STORAGE",
        payload,
      });

      hydrated.current = true;

      prevMode.current = mode;

      return;

    }



    if (prevMode.current !== mode) {

      const payload =
        mode === OmnistonMode.SWAP
          ? (initialState ?? OMNISTON_TON_SWAP_DEFAULT_STATE)
          : persist
            ? loadStoredFormState(mode)
            : getDefaultSwapFormState(mode);

      dispatch({

        type: "INITIALIZE_FROM_STORAGE",

        payload,

      });

      prevMode.current = mode;

    }

  }, [initialState, mode, persist]);

  useEffect(() => {
    if (!hydrated.current || !persist) return;

    try {
      localStorage.setItem(getSwapFormStorageKey(mode), JSON.stringify(state));
    } catch {
      //
    }
  }, [persist, state, mode]);



  return (

    <SwapContext.Provider value={state}>

      <SwapContextDispatch.Provider value={dispatch}>

        <SwapFormAssetHydrator />

        {children}

      </SwapContextDispatch.Provider>

    </SwapContext.Provider>

  );

};



export const useSwapForm = () => useContext(SwapContext);

export const useSwapFormDispatch = () => useContext(SwapContextDispatch);

