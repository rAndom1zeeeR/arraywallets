import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Coins,
  KeyRound,
  RefreshCw,
  Search,
  Shield,
  Wallet,
} from "lucide-react";

export const DEMO_WALLET_ADDRESS =
  "EQDE1Ww65RODMwxwDL59kwK8IQq74rIC-ElG_KD-16jfVV6q";

export interface HomeFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  tag?: string;
}

export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: Wallet,
    title: "Wallet explorer",
    description:
      "Track TON wallets: balances, transaction history, event filters, and sync status in one place.",
    href: "/wallets",
    tag: "Core",
  },
  {
    icon: Coins,
    title: "Jetton portfolio & PnL",
    description:
      "Per-wallet jetton holdings with live prices from TonAPI and profit/loss across your positions.",
    href: "/wallets",
    tag: "Analytics",
  },
  {
    icon: BarChart3,
    title: "Swap analytics",
    description:
      "Infer swap actions from on-chain events, aggregate stats, and PnL summaries per jetton.",
    href: "/wallets",
    tag: "Analytics",
  },
  {
    icon: ArrowLeftRight,
    title: "Cross-chain swaps",
    description:
      "Omnistone powered by STON.fi Omniston — route swaps and connect EVM wallets via WalletConnect.",
    href: "/omnistone",
    tag: "Omnistone",
  },
  {
    icon: KeyRound,
    title: "Authentication",
    description:
      "Sign in with TON Connect and ton_proof verification. Admin role is assigned via wallet allowlist.",
    href: "/sign-in",
    tag: "Auth",
  },
  {
    icon: Shield,
    title: "REST API",
    description:
      "Programmatic access to wallet summaries, paginated events, sync triggers, and health checks.",
    tag: "API",
  },
];

export interface HomeWorkflowStep {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const HOME_WORKFLOW_STEPS: HomeWorkflowStep[] = [
  {
    step: 1,
    icon: KeyRound,
    title: "Sign in",
    description:
      "Connect your TON wallet via TON Connect. Admin access is granted through a wallet allowlist.",
  },
  {
    step: 2,
    icon: Search,
    title: "Add a wallet",
    description:
      "Paste any TON address on the Wallets page and click Analyze to start tracking it in the database.",
  },
  {
    step: 3,
    icon: RefreshCw,
    title: "Sync from TonAPI",
    description:
      "Hit Sync on a wallet page — the app pulls events, actions, and jetton data from TonAPI into PostgreSQL.",
  },
  {
    step: 4,
    icon: BarChart3,
    title: "Explore & analyze",
    description:
      "Browse events with filters, view balances, jetton PnL, swap stats, and per-jetton trade history.",
  },
  {
    step: 5,
    icon: ArrowLeftRight,
    title: "Swap cross-chain",
    description:
      "Open Omnistone to quote and execute cross-chain swaps with TON and EVM wallets connected side by side.",
  },
];

export const HOME_TECH_STACK = [
  "Next.js 16",
  "TypeScript",
  "PostgreSQL",
  "Prisma 7",
  "TonAPI",
  "Auth.js",
  "TON Connect",
  "STON.fi Omniston",
] as const;
