# Frontend architecture

Next.js 16 App Router app for Agele. The backend contract, data model and system diagrams live in [jog01/agele/docs](https://github.com/jog01/agele/tree/main/docs).

![Terminal, desktop](images/terminal-desktop.png)

## Routes

```mermaid
flowchart LR
  ROOT["/ landing"] --> TRADE["/trade"]
  TRADE -- redirect --> MINT["/trade/[mint]<br/>terminal (default SOL)"]
  NAV{{Top bar / mobile nav}} --> MINT
  NAV --> FEED["/feed<br/>theses + traders to follow"]
  NAV --> LB["/leaderboard<br/>24h / 7d / 30d"]
  NAV --> PF["/portfolio<br/>equity, holdings, PnL"]
  SEARCH{{"Cmd/Ctrl+K or /<br/>search dialog"}} --> MINT
```

Every page renders inside `AppShell` (top bar, status strip, mobile bottom nav, search dialog). Static shells prerender; `/trade/[mint]` streams the terminal under `<Suspense>` because it reads route params.

## Screens (v0.1, demo data)

| Feed | Leaderboard | Portfolio |
| --- | --- | --- |
| ![Feed](images/feed.png) | ![Leaderboard](images/leaderboard.png) | ![Portfolio](images/portfolio.png) |

## Terminal component tree

```mermaid
flowchart TB
  PAGE["app/trade/[mint]/page.tsx"] --> SHELL[AppShell]
  SHELL --> TOP[TopBar]
  SHELL --> STRIP[StatusStrip]
  SHELL --> SD[SearchDialog]
  PAGE --> TERM[Terminal]
  TERM --> L[Left 264px]
  TERM --> M[Center, flexible]
  TERM --> R[Right 320px]
  L --> EXP[MarketExplorer<br/>filter, Supported / Watchlist]
  L --> TT[TopTraders]
  M --> SUM[AssetSummary]
  M --> CH[PriceChart<br/>lightweight-charts]
  M --> ACT[ActivityPanel<br/>Activity / Thesis]
  R --> OT[OrderTicket] --> QR[QuoteReviewDialog]
  R --> POS[PositionCard]
  R --> MC[MarketContext]
  TERM -. "below md" .-> SHEET[Buy / Sell bar → bottom sheet with OrderTicket]
```

## Data flow

```mermaid
flowchart LR
  API[(Agele API<br/>REST /v1)] -- "openapi-fetch<br/>typed by schema.d.ts" --> Q[TanStack Query cache]
  WS[(API /ws)] -- "token:&lt;mint&gt;:trades" --> RT[lib/realtime.ts<br/>one socket, backoff, resubscribe]
  RT -- "useLiveTrades: prepend, dedupe by signature" --> Q
  RT -- "onTrade: update last candle" --> CH[PriceChart]
  RT -- status --> RS[stores/realtime<br/>Zustand]
  RS --> STRIP[StatusStrip<br/>Live / Reconnecting, last update age]
  Q --> UI[Explorer, summary, activity,<br/>leaderboard, feed]
  PREFS[stores/terminal<br/>interval, watchlist<br/>persisted] --> UI
  PRIVY[Privy SDK] -- access token --> API
```

On reconnect the client re-subscribes every active topic and invalidates token queries, so the REST snapshot replaces anything missed while offline. The chart never invents candles for gaps.

## Realtime connection states

```mermaid
stateDiagram-v2
  [*] --> connecting
  connecting --> open: socket open
  open --> closed: drop / error
  closed --> connecting: backoff 1s → 2s → … max 30s
  open --> open: frame (touch lastMessageAt)
```

## Order flow

![Explicit review before signing](images/trade-review.png)

```mermaid
sequenceDiagram
  participant U as User
  participant OT as OrderTicket
  participant QR as QuoteReviewDialog
  participant W as Privy wallet
  U->>OT: amount / preset, Buy or Sell
  OT->>OT: client estimate (display only)
  U->>QR: Review
  QR->>U: From/To + mints, min receive, slippage, impact, fees
  Note over QR: v0.1 demo: Confirm disabled
  U-->>QR: Confirm (when live)
  QR-->>W: sign server-built tx
```

## Mobile

<img src="images/mobile-sell.png" alt="Mobile sell sheet" width="280" />

Below the `md` breakpoint the terminal is one column; the top nav moves to a bottom bar, the search opens from an icon, and Buy/Sell open the order ticket in a bottom sheet with the matching side selected.

## Theme

Graphite/Ice, dark only: shell `#0B0E13`, panel `#11161D`, floating `#171E28`, primary `#9CCBFF`, buy `#5DE0AA`, sell `#FF8195`, warning `#F1C981`. Geist / Geist Mono, data text at least 12px, colour never the only signal. Tokens live in `src/app/globals.css`.
