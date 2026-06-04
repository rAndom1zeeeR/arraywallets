# AGENTS.md

## Cursor Cloud specific instructions

### Product

Single Next.js 16 app (`tonapi`) for TON wallet events, sync from TonAPI, swap analytics, and jetton/portfolio PnL. See `package.json` scripts and `README.md` for standard commands.

### Required services

| Service | Notes |
|---------|--------|
| **Next.js** | `pnpm dev` → http://localhost:3000 |
| **PostgreSQL** | `DATABASE_URL` must be set (Prisma 7 + `@prisma/adapter-pg`) |
| **TonAPI (hosted)** | `NEXT_PUBLIC_TONAPI_BASE_URL` (client + server), `TONAPI_API_KEY` (server only, never `NEXT_PUBLIC_`) — required for live sync and rate refresh |
| **Auth.js** | **`AUTH_SECRET` required in production** (without it `/api/auth/session` returns 500). OAuth (`AUTH_GITHUB_*`, `AUTH_GOOGLE_*`) optional. TON Connect + `/tonconnect-manifest.json`, JWT 15m + rotating refresh cookie, optional `AUTH_ADMIN_EMAILS` / `AUTH_ADMIN_WALLETS` |

No Docker Compose or separate workers in this repo.

### Bootstrap (first time or after schema changes)

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:deploy   # apply migrations when schema changes
```

### Lint / build / dev

- **Lint:** `pnpm lint` (repo currently has a few ESLint errors in existing files; warnings are common).
- **Build:** `pnpm build` — the Cloud VM may set a non-standard Node runtime mode variable, which breaks `next build` (`/_global-error` prerender / `useContext` errors). Run the build in a clean shell with production mode (Next.js docs) and required secrets (`DATABASE_URL`, TonAPI vars) passed explicitly.
- **Dev:** `pnpm dev` on port 3000. Default wallet redirect is in `src/app/page.tsx`.

### Long-running dev server

Use a dedicated tmux session (e.g. `next-dev-server`) so the process survives backgrounding:

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s next-dev-server -c /workspace -- bash -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t next-dev-server:0.0 'cd /workspace && pnpm dev' C-m
```

### API smoke checks

Default address (also used by `/` redirect):

`EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl`

```bash
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/summary"
curl -sS "http://localhost:3000/api/wallets/EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl/events?limit=2"
```

Core flow: UI **Sync** → `POST /api/sync` → TonAPI → Postgres → summary/events tables update.

### Prisma Studio (optional)

`pnpm prisma:studio` — default port 5555.
