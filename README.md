# TON Wallets

TON wallet events, sync, swap analytics, and jetton/portfolio PnL — built with Next.js 16, Prisma 7, and PostgreSQL.

> **Live:** [ton-wallets.vercel.app](https://ton-wallets.vercel.app)

---

## Features

- **Wallet explorer** — browse tracked wallets, view events, balances, and transaction history
- **Jetton portfolio & PnL** — per-wallet jetton holdings with price tracking and profit/loss calculation
- **Swap analytics** — infer swap actions from transactions, aggregate swap stats, PnL summaries per jetton
- **Cross-chain swaps (Omnistone)** — STON.fi Omniston integration with EVM wallet connect via Reown/WalletConnect
- **Authentication** — TON Connect wallet sign-in, GitHub & Google OAuth, role-based access (admin by email/wallet)
- **API** — REST endpoints for wallet summaries, events, sync, and health checks
- **Docker-ready** — multi-stage Dockerfile, docker-compose.yml, healthcheck on `/api/health`

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Auth.js (NextAuth v5) + TON Connect |
| UI | Radix UI, shadcn/ui, Tailwind CSS 4 |
| State | TanStack React Query |
| Blockchain | @ton/core, @ton/ton, @tonconnect/sdk, @tonconnect/ui-react |
| Swaps | @ston-fi/omniston-sdk, @ston-fi/api |
| EVM | wagmi, viem, @reown/appkit (WalletConnect) |
| Deployment | Docker / Dokploy / Vercel |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 24
- **pnpm** (corepack enabled)
- **PostgreSQL** 15+ (local or remote)

### 1. Clone & Install

```bash
git clone https://github.com/rAndom1zeeeR/ton-wallets.git
cd ton-wallets
pnpm install
```

### 2. Configure Environment

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) for details on each variable.

### 3. Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Apply migrations
pnpm prisma:migrate     # dev — creates a new migration
# or
pnpm prisma:deploy       # production — applies pending migrations
```

### 4. Run Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The root page redirects to `/wallets`.

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ton_wallets` |
| `AUTH_SECRET` | Auth.js session/JWT signing key. Generate with `npx auth secret` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used for TON Connect manifest & ton_proof domain) | `http://localhost:3000` |
| `NEXT_PUBLIC_TONAPI_BASE_URL` | TonAPI base URL (public, safe for browser) | `https://tonapi.io` |
| `TONAPI_API_KEY` | TonAPI server-side key (**never** use `NEXT_PUBLIC_` prefix) | `AF...` |

### Optional — Auth

| Variable | Description |
|----------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `AUTH_GOOGLE_ID` | Google Cloud Console OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console OAuth Client Secret |
| `AUTH_ADMIN_EMAILS` | Comma-separated emails that get ADMIN role on sign-in |
| `AUTH_ADMIN_WALLETS` | Comma-separated TON wallet addresses (raw `workchain:hex`) for ADMIN role |
| `AUTH_TON_CONNECT_DOMAIN` | Primary ton_proof domain (defaults to `NEXT_PUBLIC_APP_URL` host) |
| `AUTH_TON_PROOF_DOMAINS` | Additional allowed ton_proof domains (comma-separated) |

### Optional — Omnistone (Cross-chain Swaps)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Reown (WalletConnect) project ID for EVM wallet on `/omnistone`. Create at [cloud.reown.com](https://cloud.reown.com) | — |
| `NEXT_PUBLIC_OMNISTON_WS_URL` | Omniston WebSocket API URL | `wss://omni-ws.ston.fi` |
| `OMNIDEMO__STON_API` | STON.fi assets API URL (for `/omnistone` demo) | `https://api.ston.fi` |

> ⚠️ **Security note:** `TONAPI_API_KEY` must **not** have the `NEXT_PUBLIC_` prefix. The deprecated `NEXT_PUBLIC_TONAPI_API_KEY` leaks into the client bundle — use `TONAPI_API_KEY` instead.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                #   REST endpoints (health, wallets, sync, …)
│   ├── omnistone/          #   Cross-chain swap page
│   ├── profile/            #   User profile
│   ├── sign-in/            #   Sign-in page
│   └── wallets/            #   Wallet list & details
├── modules/
│   ├── auth/               #   Auth.js config, TON Connect provider, roles
│   ├── jetton/             #   Jetton prices, PnL calculation & persistence
│   ├── omniston/           #   STON.fi Omniston SDK integration
│   ├── swap/               #   Swap inference, stats, PnL summaries
│   └── wallet/             #   Wallet queries, events, sync logic
├── shared/
│   ├── components/         #   Shared UI components (theme, etc.)
│   ├── config/             #   Env validation (Zod schemas), auth providers
│   ├── constants/          #   App-wide constants
│   ├── infrastructure/     #   Prisma client, API helpers
│   ├── lib/                #   Utility functions
│   ├── presentation/       #   Shared UI primitives (shadcn)
│   └── providers/          #   React context providers
├── auth.ts                 #   NextAuth entry point
├── instrumentation.ts      #   Next.js instrumentation hooks
└── proxy.ts                #   Auth proxy re-export
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness probe (checks DB connection) |
| `GET` | `/api/wallets/:address/summary` | Wallet summary (balances, PnL) |
| `GET` | `/api/wallets/:address/events` | Wallet event history (paginated) |
| `POST` | `/api/sync` | Sync wallet data from TonAPI → Postgres |

### Smoke Tests

```bash
# Health check
curl -sS http://localhost:3000/api/health

# Wallet summary (default test address)
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/summary"

# Wallet events
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/events?limit=2"
```

---

## Authentication

The app supports multiple sign-in methods:

1. **TON Connect** — wallet-based authentication with ton_proof verification
2. **GitHub OAuth** — requires `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET`
3. **Google OAuth** — requires `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`

### Admin Access

Users are assigned the `ADMIN` role when their email matches `AUTH_ADMIN_EMAILS` or their wallet address matches `AUTH_ADMIN_WALLETS`.

### TON Connect Manifest

The manifest is at `public/tonconnect-manifest.json`. Update the `url` and `iconUrl` fields to match your deployment domain.

---

## Omnistone Integration

The `/omnistone` page provides a cross-chain swap interface powered by [STON.fi Omniston](https://ston.fi):

- **Omniston SDK** (`@ston-fi/omniston-sdk`) handles swap routing
- **Reown AppKit** (`@reown/appkit`) enables EVM wallet connections (MetaMask, etc.)
- **WalletConnect** project ID is required — create one at [cloud.reown.com](https://cloud.reown.com)

### Setup

1. Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` in `.env.local`
2. (Optional) Set `NEXT_PUBLIC_OMNISTON_WS_URL` if using a custom Omniston relay
3. Navigate to `/omnistone` — the swap UI loads automatically

---

## Docker Deployment

### Build & Run

```bash
docker build -t ton-wallets .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/ton_wallets \
  -e AUTH_SECRET=your-secret \
  -e TONAPI_API_KEY=your-key \
  ton-wallets
```

### Docker Compose

```bash
# Set required variables in .env or shell
docker compose up -d

# Before first deploy, run migrations:
DATABASE_URL=postgresql://user:pass@db:5432/ton_wallets pnpm prisma:deploy
```

The Dockerfile uses a multi-stage build (Node 24 Alpine, standalone Next.js output). Health check hits `/api/health` every 15 seconds.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Create & apply migration (dev) |
| `pnpm prisma:deploy` | Apply pending migrations (prod) |
| `pnpm prisma:studio` | Open Prisma Studio on port 5555 |
| `pnpm prisma:reset` | Reset database (dev only) |

---

## Key Services

| Service | Purpose | Required |
|---------|---------|----------|
| **PostgreSQL** | Primary database (Prisma adapter) | ✅ Yes |
| **TonAPI** | Blockchain data: events, jetton prices, wallet info | ✅ Yes |
| **Auth.js** | Session management, JWT + refresh tokens | ✅ In production |
| **Reown (WalletConnect)** | EVM wallet connect on `/omnistone` | ⬜ Optional |
| **GitHub OAuth** | Sign-in with GitHub | ⬜ Optional |
| **Google OAuth** | Sign-in with Google | ⬜ Optional |

---

## License

Private repository. All rights reserved.