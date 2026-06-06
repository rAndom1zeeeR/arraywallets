import type { ReactNode } from "react";
import { OmnistonDemoProviders } from "@/modules/omniston/presentation/providers/OmnistonDemoProviders";

interface OmnistoneLayoutProps {
  children: ReactNode;
}

export default function OmnistoneLayout({ children }: OmnistoneLayoutProps) {
  return <OmnistonDemoProviders>{children}</OmnistonDemoProviders>;
}
