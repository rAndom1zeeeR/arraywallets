"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";

interface OmnistonModeContextValue {
  mode: OmnistonMode;
  setMode: (mode: OmnistonMode) => void;
}

const OmnistonModeContext = createContext<OmnistonModeContextValue | null>(null);

interface OmnistonModeProviderProps {
  children: ReactNode;
  initialMode?: OmnistonMode;
}

export const OmnistonModeProvider = ({
  children,
  initialMode = OmnistonMode.TRANSFER,
}: OmnistonModeProviderProps) => {
  const [mode, setModeState] = useState<OmnistonMode>(initialMode);

  const setMode = useCallback((nextMode: OmnistonMode) => {
    setModeState(nextMode);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <OmnistonModeContext.Provider value={value}>{children}</OmnistonModeContext.Provider>;
};

export const useOmnistonMode = (): OmnistonModeContextValue => {
  const context = useContext(OmnistonModeContext);

  if (!context) {
    throw new Error("useOmnistonMode must be used within OmnistonModeProvider");
  }

  return context;
};
