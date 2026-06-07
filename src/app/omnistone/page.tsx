import type { Metadata } from "next";
import { Suspense } from "react";
import { OmnistonDemoPage } from "@/modules/omniston/presentation/pages/OmnistonDemoPage";

export const metadata: Metadata = {
  title: "Omnistone | ArrayWallets",
  description: "Cross-chain swaps powered by STON.fi Omniston",
};

function OmnistonSwapFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-height))] items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Loading Omnistone…</p>
    </div>
  );
}

export default function OmnistonePage() {
  return (
    <Suspense fallback={<OmnistonSwapFallback />}>
      <OmnistonDemoPage />
    </Suspense>
  );
}
