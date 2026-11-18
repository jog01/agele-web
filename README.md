# agele-web

Next.js 16 frontend for Agele, a social trading terminal for Solana spot markets. The backend (REST, WebSocket, jobs) lives in [jog01/agele](https://github.com/jog01/agele). Frontend diagrams (routes, component tree, data flow): [docs/architecture.md](docs/architecture.md). Sign-in, embedded wallet and deposit: [docs/auth-wallet.md](docs/auth-wallet.md). Gasless swap quotes, signing and submission: [docs/swaps.md](docs/swaps.md).

Stack: Next.js 16 (App Router, Turbopack, Cache Components), shadcn/ui, Tailwind v4, TradingView `lightweight-charts`, TanStack Query + `openapi-fetch`, Zustand, Privy, Biome, Vitest.

## Run locally

Requires Bun 1.4+ and the backend from jog01/agele with the REST API running on `:4000` and the separate WebSocket gateway on `:4001` (`/ws`).

```bash
bun install
cp .env.example .env.local
bun run dev          # http://localhost:3000/trade
```

Demo labels appear when `/health` reports mock data (or cannot confirm live data), or Privy is unconfigured. Swap submission requires sign-in; trading availability is gated by the API's `trading_disabled` response, not fixture-data mode. Without `NEXT_PUBLIC_PRIVY_APP_ID`, sign-in is unavailable. Set `NEXT_PUBLIC_SOLANA_RPC_URL` to a domain-restricted RPC key (e.g. Helius) for wallet balances; the public mainnet RPC rejects browser token-account queries.

## Live data

See [live data flow diagrams and the mock-mode UI screenshot](docs/live-data.md).

## API types

`src/lib/api/schema.d.ts` is generated from the API's OpenAPI document and committed. After the API changes:

```bash
bun run api:types                                         # from a local API at :4000
OPENAPI_URL=../agele/openapi.json bun run api:types       # or from a checkout of jog01/agele
```

## Checks

```bash
bun run check   # biome, tsc, vitest
bun run build
```

The product name is set in one place: `src/lib/config.ts` (`PRODUCT_NAME`).
