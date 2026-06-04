import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthAppHeader, AuthSessionProvider, TonConnectAuthProvider } from "@/modules/auth";
import { QueryProvider } from "@/shared/providers/QueryProvider";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { cn } from "@/shared/lib/utils";
import "./globals.css";

const inter = localFont({
  src: [
    {
      path: "../../public/fonts/Inter-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Inter-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Inter-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TON Wallet Transactions",
  description: "View TON blockchain wallet transactions via TonAPI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, "font-inter antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TonConnectAuthProvider>
            <AuthSessionProvider>
              <QueryProvider>
                <AuthAppHeader />
                {children}
              </QueryProvider>
            </AuthSessionProvider>
          </TonConnectAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
