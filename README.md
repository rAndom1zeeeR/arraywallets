# TON Wallets

> TON wallet events, sync, swap analytics, and jetton/portfolio PnL — built with Next.js 16, Prisma 7, and TonAPI.

---

## ✨ Features

- **Wallet Explorer** — browse analyzed TON wallets, view events, actions, and transaction history with pagination and filters.
- **Jetton Portfolio & PnL** — track jetton balances, price changes (24h / 7d / 30d), and portfolio profit/loss.
- **Swap Analytics** — infer swaps from transactions, aggregate swap stats, and display PnL summaries per jetton.
- **Cross-chain Swaps (Omnistone)** — swap tokens across chains via STON.fi Omniston SDK with EVM wallet connect (Reown / WalletConnect).
- **Authentication** — sign in with TON Connect wallet, GitHub, or Google; role-based access (admin by email or wallet address); JWT + rotating refresh tokens.
- **Sync Engine** — pull wallet data from TonAPI into Postgres for fast queries and historical analysis.
- **Docker-ready** — multi-stage Dockerfile, `docker-compose.yml` with health checks, resource limits, and Dokploy/Traefik support.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-------------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma 7 |
| Auth | Auth.js v5 (NextAuth) + TON Connect |
| UI | React 19, Radix UI, shadcn/ui, Tailwind CSS 4 |
| Blockchain | @ton/core, @ton/ton, @tonconnect/sdk, TonAPI |
| Swaps | STON.fi Omniston SDK, Reown AppKit (WalletConnect) |
| State | TanStack React Query, TanStack Table |
| Containerization | Docker (Node 24 Alpine), Docker Compose |

---

## 📋 Prerequisites

- **Node.js** ≥ 20 (24 recommended)
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 15 (or use the Docker Compose service)
- **TonAPI** account — [tonapi.io](https://tonapi.io) for API key
- **Auth.js** secret — generated via `npx auth secret`

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rAndom1zeeeR/ton-wallets.git
cd ton-wallets
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` — see [Environment Variables](#-environment-variables) for details.

### 3. Database Setup

```bash
pnpm prisma:generate
pnpm prisma:migrate   # dev: creates & applies migrations
# or for production:
pnpm prisma:deploy    # applies pending migrations
```

### 4. Run Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — the app redirects to `/wallets`.

---

## 🐳 Docker

### Build & Run

```bash
docker compose up -d
```

The `docker-compose.yml` includes a health check on `/api/health` and resource limits (1 CPU / 2 GB RAM).

### Required Environment (Docker)

Set these before `docker compose up`:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/ton_wallets"
export NEXT_PUBLIC_TONAPI_BASE_URL="https://tonapi.io"
export TONAPI_API_KEY="your-key"
```

> **Important:** Run `pnpm prisma:deploy` against the same `DATABASE_URL` before the first deploy.

---

## 🔧 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ton_wallets` |
| `AUTH_SECRET` | Auth.js session/JWT signing key. Generate: `npx auth secret` | `openssl rand hex 32` output |

### TonAPI

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_TONAPI_BASE_URL` | client + server | TonAPI base URL (default: `https://tonapi.io`) |
| `TONAPI_API_KEY` | server only | API key for authenticated TonAPI requests. **Never** use `NEXT_PUBLIC_` prefix for this. |

### Authentication

| Variable | Description |
|----------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID (optional) |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret (optional) |
| `AUTH_GOOGLE_ID` | Google Cloud Console OAuth Client ID (optional) |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console OAuth Client Secret (optional) |
| `AUTH_ADMIN_EMAILS` | Comma-separated emails that receive ADMIN role on sign-in |
| `AUTH_ADMIN_WALLETS` | Comma-separated TON wallet addresses (raw `workchain:hex`) for ADMIN role |
| `AUTH_TON_PROOF_DOMAINS` | Extra allowed `ton_proof` domains (comma-separated, optional) |

### App URL

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (manifest, ton_proof fallback). Defaults to request host when `trustHost` is enabled. |

### Omnistone (Cross-chain Swaps)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Reown (WalletConnect) project ID — [cloud.reown.com](https://cloud.reown.com) |
| `NEXT_PUBLIC_OMNISTON_WS_URL` | Omniston WebSocket URL (default: `wss://omni-ws.ston.fi` — production endpoint) |

> **Note:** The production Omniston WebSocket endpoint (`wss://omni-ws.ston.fi`) is configured by default. You only need to set `NEXT_PUBLIC_OMNISTON_WS_URL` if you want to override it (e.g., for testing against a staging environment).

---

## 📁 Project Structure

```
ton-wallets/
├── prisma/                  # Prisma schema & migrations
│   └── schema.prisma        # Database models (ChainAddress, ChainJetton, ChainAction, etc.)
├── public/
│   └── tonconnect-manifest.json  # TON Connect dApp manifest
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # API endpoints (health, wallets, sync, etc.)
│   │   ├── wallets/         # Wallet list & detail pages
│   │   ├── omnistone/       # Cross-chain swap page (STON.fi Omniston)
│   │   ├── sign-in/         # Sign-in page
│   │   ├── profile/         # User profile page
│   │   ├── layout.tsx       # Root layout (providers, theme, auth)
│   │   └── page.tsx         # Home → redirects to /wallets
│   ├── modules/
│   │   ├── auth/            # Authentication (TON Connect, OAuth, roles, refresh tokens)
│   │   ├── wallet/          # Wallet explorer, events, sync
│   │   ├── jetton/          # Jetton prices, PnL, portfolio
│   │   ├── swap/            # Swap inference, stats, PnL summaries
│   │   └── omniston/        # Omniston SDK integration, demo data, providers
│   ├── shared/
│   │   ├── config/          # Env validation (Zod), auth config, public config
│   │   ├── components/      # Shared UI components (theme provider, etc.)
│   │   ├── infrastructure/  # Prisma client, API helpers
│   │   ├── lib/             # Utility functions
│   │   └── presentation/    # Shared UI primitives (shadcn-based)
│   ├── auth.ts              # NextAuth configuration
│   └── proxy.ts             # Auth re-export
├── Dockerfile               # Multi-stage production build (Node 24 Alpine)
├── docker-compose.yml       # Production deployment with health checks
├── next.config.ts           # Next.js config (standalone, transpile, aliases)
└── package.json
```

---

## 🔐 Authentication

The app supports multiple sign-in methods:

1. **TON Connect** — primary method. Users sign in by proving ownership of their TON wallet via `ton_proof`. The manifest is at `/tonconnect-manifest.json`.
2. **GitHub OAuth** — optional, configured via `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
3. **Google OAuth** — optional, configured via `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

### Roles

- **User** — default role on sign-in.
- **Admin** — assigned when `AUTH_ADMIN_EMAILS` or `AUTH_ADMIN_WALLETS` matches.

### Token Strategy

- **Access token** — JWT, 15-minute expiry.
- **Refresh token** — HTTP-only cookie, rotated on each sign-in; revoked on sign-out.

---

## 🔄 Omnistone Integration

The `/omnistone` page provides cross-chain swap functionality powered by [STON.fi Omniston](https://ston.fi):

- **Omniston SDK** — WebSocket-based routing and swap execution.
- **Reown AppKit** — EVM wallet connection (MetaMask, WalletConnect, etc.).
- **Demo mode** — mock data available in `src/modules/omniston/demo/` for development without live API access.

### Setup

1. Create a project at [cloud.reown.com](https://cloud.reown.com) and copy the project ID.
2. Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` in your `.env.local`.
3. The production Omniston WebSocket (`wss://omni-ws.ston.fi`) is already configured by default — no additional setup needed.
4. (Optional) Override the WebSocket URL with `NEXT_PUBLIC_OMNISTON_WS_URL` for testing.

---

## 🗄 Database

The Prisma schema includes these core models:

- **ChainAddress** — TON addresses with scam flags, event/action counts.
- **ChainJetton** — Jetton metadata, prices (USD/TON), 24h/7d/30d diffs.
- **ChainAction** — Transaction actions (transfers, swaps, mints, burns).
- **ChainWalletPnl** — Per-wallet jetton PnL tracking.
- **User / Account / Session** — Auth.js models with role and wallet address.

### Migrations

```bash
pnpm prisma:migrate   # Development: create & apply migration
pnpm prisma:deploy    # Production: apply pending migrations
pnpm prisma:studio    # Browse database at localhost:5555
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Liveness probe (checks DB connection) |
| `/api/wallets/[address]/summary` | GET | Wallet summary (balances, PnL) |
| `/api/wallets/[address]/events` | GET | Wallet event history (paginated, filterable) |
| `/api/sync` | POST | Trigger wallet sync from TonAPI |

### Smoke Tests

```bash
curl -sS "http://localhost:3000/api/health"
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/summary"
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/events?limit=2"
```

---

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint check |
| `pnpm lint:fix` | ESLint auto-fix |
| `pnpm format` | Prettier format |
| `pnpm format:check` | Prettier check |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Create & apply migration (dev) |
| `pnpm prisma:deploy` | Apply pending migrations (prod) |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm prisma:reset` | Reset database (dev only) |

---

## 🚢 Deployment

### Vercel

The app is deployed at [ton-wallets.vercel.app](https://ton-wallets.vercel.app). Set all environment variables in the Vercel dashboard.

### Docker / Dokploy

```bash
docker compose up -d
```

Make sure `DATABASE_URL` and `TONAPI_API_KEY` are set before starting. The container health check hits `/api/health` every 15 seconds.

### Production Notes

- `AUTH_SECRET` is **required** in production — without it, `/api/auth/session` returns 500.
- `TONAPI_API_KEY` must be a server-only variable (no `NEXT_PUBLIC_` prefix).
- The `tonconnect-manifest.json` in `public/` uses the production URL — update it for custom domains.
- Next.js `output: "standalone"` is enabled for optimal Docker images.

---

## 📄 License

Private repository. All rights reserved.

---

[🇷🇺 Документация на русском](./README.ru.md)