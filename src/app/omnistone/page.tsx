import type { Metadata } from "next";
import { Suspense } from "react";
import { OmnistonDemoPageSkeleton } from "@/modules/omniston/presentation/components/omniston-demo-page-skeleton";
import { OmnistonDemoPage } from "@/modules/omniston/presentation/pages/OmnistonDemoPage";

export const metadata: Metadata = {
  title: "Omnistone | ArrayWallets",
  description: "Cross-chain swaps powered by STON.fi Omniston",
};

export default function OmnistonePage() {
  return (
    <Suspense fallback={<OmnistonDemoPageSkeleton />}>
      <OmnistonDemoPage />
    </Suspense>
  );
}
