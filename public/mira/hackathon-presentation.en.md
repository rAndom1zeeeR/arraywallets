# TON Wallets — Hackathon Presentation
## STON.fi Vibe Coding Hackathon Wave 2

---

## Slide 1: Title

**TON Wallets — Smart Wallet Analytics & Cross-Chain Swaps on TON**

*Subtitle:* Built for STON.fi Vibe Coding Hackathon Wave 2 — STON.fi Track + Mira Track

**Visual:** Dark futuristic background with glowing TON diamond logo, STON.fi gradient wave, and Mira AI icon. Bold title "TON Wallets" in white. Hackathon badge "STON.fi Vibe Coding Hackathon Wave 2".

---

## Slide 2: The Problem

- TON blockchain has 50M+ wallets, but **no unified analytics dashboard**
- Users can't track portfolio PnL, swap performance, or jetton price changes in one place
- Cross-chain swaps require navigating multiple DEXs and bridges — **fragmented UX**
- Wallet data is scattered across TonAPI endpoints with no aggregated view

**Visual:** Split screen — left: chaotic scattered data points, broken charts. Right: question marks and frustrated user silhouette. Muted colors.

---

## Slide 3: Our Solution

**TON Wallets** — an all-in-one platform that combines:
1. **Wallet Explorer** — browse, search, and analyze any TON wallet
2. **Jetton Portfolio & PnL** — real-time price tracking with 24h/7d/30d diffs
3. **Swap Analytics** — inferred swap detection, PnL per jetton
4. **Cross-Chain Swaps** — Omnistone integration for seamless multi-chain swaps
5. **AI-Powered Insights** — Mira AI agent for wallet analysis and on-chain actions

**Visual:** Clean dashboard mockup showing all 5 features as cards/modules. Bright accent colors on dark background.

---

## Slide 4: Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Prisma 7 |
| Auth | Auth.js v5 + TON Connect |
| Blockchain | @ton/core, TonAPI |
| Cross-chain | STON.fi Omniston SDK v1beta8 |
| EVM Connect | Reown AppKit (WalletConnect) |
| AI Agent | Mira (@mira) |
| UI | Radix UI, shadcn/ui, Tailwind CSS 4 |
| Deployment | Docker / Vercel |

**Visual:** Hexagonal tech stack diagram with logos. Dark theme, neon accents matching STON.fi brand colors.

---

## Slide 5: Omniston Integration (STON.fi Track)

**Cross-chain swaps powered by STON.fi Omniston SDK v1beta8**

- **Omniston SDK** — WebSocket-based routing for best-price cross-chain swaps
- **Reown AppKit** — EVM wallet connection (MetaMask, WalletConnect, etc.)
- **Production endpoint** — `wss://omni-ws.ston.fi` (no staging needed)
- **Swap flow:** User selects tokens → Omniston routes → Best price execution → On-chain settlement
- **No bridges, no wrapped tokens** — native cross-chain via aggregated liquidity

**Visual:** Swap flow diagram: TON wallet → Omniston SDK → Multiple chains (Ethereum, BSC, etc.) → Best route highlighted. STON.fi branding.

---

## Slide 6: Mira AI Integration (Mira Track)

**Mira AI agent — integrated into the development workflow**

- **All project materials** (README, presentation text, descriptions) were created using @mira
- **Code assistance** — Mira helped scaffold components, debug integrations, and generate documentation
- **Wallet analysis** — Mira's TON wallet skill provides on-demand wallet analytics
- **On-chain actions** — Mira can trigger sync, look up balances, and analyze PnL directly from Telegram
- **Hackathon compliance** — Mira is embedded in both the development process AND the product workflow

**Visual:** Mira logo/icon centered, with radiating connections to: Code Editor, Telegram Chat, Wallet Dashboard, Documentation. Glowing purple effect.

---

## Slide 7: TonAPI Integration

**TonAPI — the backbone of wallet data**

- **Wallet Events** — real-time transaction history with action classification
- **Jetton Prices** — USD/TON prices with 24h, 7d, 30d percentage changes
- **Address Metadata** — scam flags, verification status, action counts
- **Sync Engine** — pulls TonAPI data into PostgreSQL for fast queries & historical analysis
- **Server-side only** — `TONAPI_API_KEY` never exposed to the client

**Visual:** Data flow diagram: TonAPI cloud → Sync Engine → PostgreSQL → Dashboard UI. Lock icon on API key. Blue/teal color scheme.

---

## Slide 8: Wallet Explorer & PnL

**Wallet Explorer — deep analytics for any TON wallet**

- Search any TON address → instant overview
- Event history with pagination and filters
- Jetton holdings with real-time price tracking
- Portfolio PnL calculation per jetton
- Swap detection: automatically infers swaps from transaction actions
- Admin role system (by email or wallet address)

**Visual:** Dashboard screenshot mockup — wallet address bar, event list, jetton cards with PnL indicators (green/red). Clean dark UI.

---

## Slide 9: Authentication & Security

**Multi-method auth with role-based access**

- **TON Connect** — primary sign-in via wallet ownership proof (ton_proof)
- **GitHub OAuth** — for developer access
- **Google OAuth** — for general users
- **JWT + Refresh Tokens** — 15-min access, HTTP-only refresh with rotation
- **Admin roles** — assigned by email or wallet address match
- **Security** — `TONAPI_API_KEY` server-only, `AUTH_SECRET` required in production

**Visual:** Auth flow diagram: 3 login methods → JWT token → Role check → Dashboard. Shield/lock icons. Secure feel.

---

## Slide 10: Architecture & Data Flow

**Architecture overview**

```
User Browser
    ↓ (TON Connect / OAuth)
Next.js 16 App Router
    ↓ (API Routes)
┌─────────────────────────────────┐
│  Server-side                     │
│  ├── Auth.js (JWT + refresh)     │
│  ├── TonAPI client (server key)  │
│  ├── Omniston SDK (WebSocket)    │
│  └── Prisma 7 → PostgreSQL       │
└─────────────────────────────────┘
    ↑ Sync Engine          ↓ REST API
TonAPI (blockchain)    Dashboard UI
```

- **Sync Engine** pulls data from TonAPI → stores in PostgreSQL
- **API Routes** serve aggregated data to the frontend
- **Omniston SDK** handles cross-chain swap routing server-side

**Visual:** Architecture diagram with colored boxes and arrows. Clean, technical feel. Dark background with neon connections.

---

## Slide 11: Demo Screenshots

**Live product — ton-wallets.vercel.app**

- Wallet list with search and overview
- Wallet detail: events, balances, PnL
- Jetton portfolio with price changes
- Omnistone cross-chain swap interface
- Sign-in with TON Connect

**Visual:** Collage of 4-5 actual screenshots from the live app. Clean grid layout with subtle shadows.

---

## Slide 12: Hackathon Track Compliance

**Track qualification checklist**

✅ **STON.fi Track**
- Omniston SDK v1beta8 integrated (`@ston-fi/omniston-sdk`)
- Cross-chain swap functionality on `/omnistone` page
- Production WebSocket endpoint (`wss://omni-ws.ston.fi`)
- EVM wallet connection via Reown AppKit

✅ **Mira Track**
- All project documentation (README, presentation) created with @mira
- Mira used for code scaffolding, debugging, and integration assistance
- Mira's TON wallet skill available for on-chain analysis
- Mira embedded in the development workflow throughout the hackathon

✅ **General Requirements**
- Functional working app: ✅ ton-wallets.vercel.app
- Clear use case: ✅ Wallet analytics + cross-chain swaps
- GitHub repository: ✅ github.com/rAndom1zeeeR/ton-wallets
- Video presentation: ✅ (to be recorded)

**Visual:** Checklist with green checkmarks. Two track badges (STON.fi + Mira) prominently displayed. Clean, confident layout.

---

## Slide 13: What Makes Us Different

**Why TON Wallets stands out**

1. **All-in-one** — Analytics + Swaps + AI in a single platform
2. **Real PnL** — Not just balances, but actual profit/loss tracking per jetton
3. **Cross-chain native** — Omnistone swaps without leaving the app
4. **AI-assisted** — Mira integration for development AND user-facing features
5. **Production-ready** — Docker, health checks, auth, deployed on Vercel
6. **Open architecture** — Modular codebase, easy to extend

**Visual:** 6 feature cards in a 2x3 grid. Each with an icon and short text. Bold accent colors.

---

## Slide 14: Roadmap

**What's next**

- **Phase 2** — Multi-wallet portfolio aggregation
- **Phase 3** — AI-powered trading signals via Mira
- **Phase 4** — Telegram Mini App for mobile-first experience
- **Phase 5** — DeFi yield tracking and staking analytics

**Visual:** Horizontal timeline with 4 phases. Each phase as a milestone with icon. Gradient line connecting them.

---

## Slide 15: Thank You / CTA

**Thank you!**

🔗 Live app: [ton-wallets.vercel.app](https://ton-wallets.vercel.app)
📂 GitHub: [github.com/rAndom1zeeeR/ton-wallets](https://github.com/rAndom1zeeeR/ton-wallets)
🤖 Built with Mira AI agent (@mira)
⚡ Powered by STON.fi Omniston SDK

**Vote for us! 🚀**

**Visual:** Dark background. Project logo centered. Links below. STON.fi + Mira badges side by side. Large "Vote for us! 🚀" CTA.

---

## Slide 16: API Endpoints & Integration

**REST API — programmatic access to wallet data**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Liveness probe — checks DB connection |
| `GET` | `/api/wallets/:address/summary` | Wallet summary: balances, PnL, jetton holdings |
| `GET` | `/api/wallets/:address/events` | Paginated event history with action classification |
| `POST` | `/api/sync` | Trigger TonAPI sync → Postgres for a wallet |

**Example — Wallet Summary:**
```json
GET /api/wallets/EQD_VOCk...7Bl/summary
→ {
    "balance": "1,245.8 TON",
    "jettons": 12,
    "pnl_24h": "+3.2%",
    "events_count": 847
  }
```

**Example — Events:**
```json
GET /api/wallets/EQD_VOCk...7Bl/events?limit=5
→ [
    { "type": "swap", "from": "TON", "to": "jUSDC", "amount": 100 },
    { "type": "receive", "from": "EQAx...", "value": "50 TON" }
  ]
```

**Visual:** Dark terminal-style code block with syntax-highlighted JSON responses. API route diagram on the side. Green/blue accent colors.

---

## Slide 17: Cross-Chain Swap Flow

**How Omnistone swaps work — step by step**

1. **Connect** — User connects TON wallet (TON Connect) AND EVM wallet (Reown AppKit / WalletConnect)
2. **Select** — Choose source token on TON and destination token on EVM chain (e.g. TON → ETH on Ethereum)
3. **Route** — Omniston SDK queries `wss://omni-ws.ston.fi` for best route across liquidity sources
4. **Confirm** — User reviews swap details: rate, fees, estimated time, minimum received
5. **Execute** — TON transaction sent → Omniston routes → EVM tokens received in connected wallet
6. **Track** — Swap status tracked in real-time via WebSocket updates

**No bridges. No wrapped tokens. Best price via aggregated liquidity.**

**Visual:** Step-by-step flow diagram with numbered stages. Two wallet icons (TON + EVM) at top, Omniston routing engine in the middle, blockchain icons at bottom. Arrows showing token flow.

---

## Slide 18: Jetton PnL Engine

**Real profit & loss tracking — not just balances**

**How it works:**
1. **Sync** — TonAPI events are parsed and stored in PostgreSQL
2. **Detect** — Swap actions are identified within transaction events
3. **Calculate** — For each jetton: cost basis (avg buy price) vs current price
4. **Display** — PnL shown per jetton with 24h / 7d / 30d price diffs

**Example — Jetton PnL card:**
```
jUSDC
Holdings: 1,500 jUSDC ($1,498.50)
Avg buy: $0.998  |  Current: $0.999
PnL: +$1.50 (+0.10%)
24h: +0.5%  |  7d: -1.2%  |  30d: +4.8%
```

**Key insight:** Most TON explorers show balances only. We show **how much you gained or lost** on each position.

**Visual:** Jetton PnL card mockup with green/red indicators. Mini sparkline charts for 24h/7d/30d. Clean dark UI with data visualization feel.

---

## Slide 19: Sync Engine & Data Pipeline

**From blockchain to dashboard — the data pipeline**

```
TonAPI (real-time blockchain data)
    │
    ▼  POST /api/sync
┌──────────────────────────┐
│  Sync Engine              │
│  ├── Fetch wallet events  │
│  ├── Parse action types   │
│  │   ├── Swap detected    │
│  │   ├── Transfer in/out  │
│  │   └── Staking/DeFi     │
│  ├── Extract jetton data  │
│  └── Calculate PnL basis  │
└──────────────────────────┘
    │
    ▼  Prisma ORM
┌──────────────────────────┐
│  PostgreSQL               │
│  ├── Wallet               │
│  ├── WalletEvent          │
│  ├── JettonBalance        │
│  ├── JettonPrice (24h/7d) │
│  └── SwapRecord           │
└──────────────────────────┘
    │
    ▼  GET /api/wallets/:address/summary
Dashboard UI (instant queries)
```

**Why sync?** TonAPI is rate-limited. Synced data = fast queries + historical PnL.

**Visual:** Vertical data pipeline diagram with colored stages. Database schema icons. Arrows showing data flow. Blue/teal gradient.

---

## Slide 20: Live Demo — Key Screens

**What you'll see on ton-wallets.vercel.app**

**Screen 1 — Wallet List**
- Search bar for any TON address
- Wallet cards with balance, event count, last activity
- Quick filters: recently synced, top by balance

**Screen 2 — Wallet Detail**
- Full balance breakdown: TON + all jettons
- Event timeline with action icons (swap, transfer, stake)
- PnL summary per jetton holding

**Screen 3 — Omnistone Swap**
- Token selector: source (TON chain) → destination (EVM chain)
- Connected wallets indicator: TON wallet + EVM wallet
- Real-time quote with route details and fees
- One-click execution with status tracking

**Screen 4 — Sign-in**
- TON Connect QR / deep link
- GitHub & Google OAuth buttons
- Role badge (Admin / User) after authentication

**Visual:** 4-panel mockup showing each screen. Clean dark UI with realistic data. Numbered labels for each screen. Professional presentation style.

---

## Visual Descriptions Summary (for image generation)

| Slide | Visual Description |
|-------|---------------------|
| 1 | Dark futuristic background with glowing TON blockchain diamond logo, STON.fi gradient wave, and Mira AI icon. Bold title "TON Wallets" in white. Subtitle "Smart Wallet Analytics & Cross-Chain Swaps". Hackathon badge "STON.fi Vibe Coding Hackathon Wave 2". |
| 2 | Split screen: left side shows chaotic scattered data points, broken charts, question marks in muted gray. Right side shows a frustrated user silhouette. Title overlay: "The Problem". |
| 3 | Clean dashboard mockup showing 5 feature cards: Wallet Explorer, Jetton Portfolio, Swap Analytics, Cross-Chain Swaps, AI Insights. Bright accent colors on dark background. Title: "Our Solution". |
| 4 | Hexagonal tech stack diagram with logos: Next.js, PostgreSQL, Prisma, Auth.js, TON, STON.fi Omniston, Reown, Mira, Docker. Dark theme with neon blue and purple accents. |
| 5 | Swap flow diagram: TON wallet icon → Omniston SDK box → Multiple blockchain icons (Ethereum, BSC, etc.) → Best route highlighted in green. STON.fi branding. Title: "Omniston Integration". |
| 6 | Mira AI icon centered with radiating connections to: Code Editor, Telegram Chat, Wallet Dashboard, Documentation icons. Glowing purple effect. Title: "Mira AI Integration". |
| 7 | Data flow diagram: TonAPI cloud icon → Sync Engine gear → PostgreSQL cylinder → Dashboard UI screen. Lock icon on API key. Blue/teal color scheme. Title: "TonAPI Integration". |
| 8 | Dashboard screenshot mockup: wallet address search bar, event list with pagination, jetton cards with green/red PnL indicators. Clean dark UI. Title: "Wallet Explorer & PnL". |
| 9 | Auth flow diagram: 3 login method icons (TON Connect wallet, GitHub, Google) → JWT token → Role check shield → Dashboard. Secure feel with lock icons. Title: "Authentication & Security". |
| 10 | Architecture diagram with colored boxes and arrows: Browser → Next.js → Server (Auth.js, TonAPI, Omniston, Prisma) → PostgreSQL. TonAPI cloud above. Clean technical style. |
| 11 | Collage of 4-5 app screenshots in a clean grid layout with subtle shadows. Title: "Live Demo". URL badge: ton-wallets.vercel.app. |
| 12 | Checklist with green checkmarks. Two track badges: "STON.fi Track" and "Mira Track". Clean, confident layout. Title: "Track Compliance". |
| 13 | 6 feature cards in 2x3 grid: All-in-one, Real PnL, Cross-chain native, AI-assisted, Production-ready, Open architecture. Each with icon and short text. Bold accent colors. |
| 14 | Horizontal timeline with 4 phases as milestones connected by gradient line. Icons for each phase. Title: "Roadmap". |
| 15 | Dark background. TON Wallets logo centered. Links below. STON.fi + Mira badges side by side. Large "Vote for us! 🚀" CTA. |
| 16 | Dark terminal-style code block with syntax-highlighted JSON responses. API route diagram on the side. Green/blue accent colors. Title: "API Endpoints". |
| 17 | Step-by-step flow diagram with numbered stages. Two wallet icons (TON + EVM) at top, Omniston routing engine in the middle, blockchain icons at bottom. Arrows showing token flow. Title: "Cross-Chain Swap Flow". |
| 18 | Jetton PnL card mockup with green/red indicators. Mini sparkline charts for 24h/7d/30d. Clean dark UI with data visualization feel. Title: "Jetton PnL Engine". |
| 19 | Vertical data pipeline diagram with colored stages. Database schema icons. Arrows showing data flow from TonAPI through Sync Engine to PostgreSQL to Dashboard. Blue/teal gradient. Title: "Sync Engine & Data Pipeline". |
| 20 | 4-panel mockup showing each screen: Wallet List, Wallet Detail, Omnistone Swap, Sign-in. Clean dark UI with realistic data. Numbered labels. Title: "Live Demo — Key Screens". |
