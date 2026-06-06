"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AssetPickerFieldSide = "from" | "to";

interface AssetPickerFieldContextValue {
  openSide: AssetPickerFieldSide | null;
  setOpenSide: (side: AssetPickerFieldSide | null) => void;
}

const AssetPickerFieldContext = createContext<AssetPickerFieldContextValue | null>(null);

interface AssetPickerFieldProviderProps {
  children: ReactNode;
}

export const AssetPickerFieldProvider = ({ children }: AssetPickerFieldProviderProps) => {
  const [openSide, setOpenSideState] = useState<AssetPickerFieldSide | null>(null);

  const setOpenSide = useCallback((side: AssetPickerFieldSide | null) => {
    setOpenSideState(side);
  }, []);

  const value = useMemo(() => ({ openSide, setOpenSide }), [openSide, setOpenSide]);

  return (
    <AssetPickerFieldContext.Provider value={value}>{children}</AssetPickerFieldContext.Provider>
  );
};

export const useAssetPickerField = (side?: AssetPickerFieldSide) => {
  const context = useContext(AssetPickerFieldContext);

  if (!context || !side) {
    return {
      isOpen: false,
      isCompact: false,
      setOpen: (_open: boolean) => undefined,
    };
  }

  const { openSide, setOpenSide } = context;

  return {
    isOpen: openSide === side,
    isCompact: openSide !== null && openSide !== side,
    setOpen: (open: boolean) => setOpenSide(open ? side : null),
  };
};
