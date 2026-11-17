# agele-web

Next.js 16 frontend for Agele, a social trading terminal for Solana spot markets. The backend (REST, WebSocket, jobs) lives in [jog01/agele](https://github.com/jog01/agele). Frontend diagrams (routes, component tree, data flow): [docs/architecture.md](docs/architecture.md).

Stack: Next.js 16 (App Router, Turbopack, Cache Components), shadcn/ui, Tailwind v4, TradingView `lightweight-charts`, TanStack Query + `openapi-fetch`, Zustand, Privy, Biome, Vitest.

## Run locally

Requires Bun 1.4+ and the API from jog01/agele running on `:4000`.

```bash
bun install
cp .env.example .env.local
bun run dev          # http://localhost:3000/trade
```

Without `NEXT_PUBLIC_PRIVY_APP_ID` the app runs in demo mode: fixture data, sign-in and trading disabled.

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
