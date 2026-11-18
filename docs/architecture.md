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
  FEED --> TRADER["/traders/[wallet]<br/>public profile"]
  LB --> TRADER
  MINT -- "Top traders" --> TRADER
  TRADER -- "Token links" --> MINT
  SEARCH{{"Cmd/Ctrl+K or /<br/>search dialog"}} --> MINT
```

Every page renders inside `AppShell` (top bar, status strip, mobile bottom nav, search dialog). Static shells prerender; `/trade/[mint]` streams the terminal under `<Suspense>` because it reads route params.

## Trader profile

`/traders/[wallet]` streams a profile under `<Suspense>`. Names in the feed, leaderboard, and terminal's top traders open the wallet-based route. Ranked links carry the source period; other links default to 7d. The profile shows public positions, PnL, and leaderboard performance. The period selector updates from the three windows already returned by the profile API; it does not refetch.

```mermaid
sequenceDiagram
  actor U as Trader profile visitor
  participant P as Profile / TanStack Query
  participant A as Agele API
  U->>P: Open trader by wallet
  P->>A: GET /v1/traders/{wallet} (optional bearer)
  alt Trader not found
    A-->>P: 404
    P-->>U: Trader not found
  else Profile found
    A-->>P: Profile, all windows, and X-Data-Source
    P-->>U: Profile, positions, and source label
    opt Signed-in visitor follows or unfollows
      U->>P: Follow / Unfollow
      P->>A: PUT / DELETE /v1/follows/{wallet}
      P->>A: Refresh profile to update follow state and counts
    end
    P->>A: GET /v1/traders/{wallet}/trades
    A-->>P: Newest trades and nextCursor
    opt Cursor present and visitor loads more
      U->>P: Load more trades
      P->>A: GET /v1/traders/{wallet}/trades?cursor=…
      A-->>P: Next page, null cursor at end
    end
  end
```

Profile caches are keyed by wallet and viewer so signed-in following state stays separate. Demo profiles show simulated stats and explain the absence of positions and history. Explorer links are shown only for responses marked `indexed`.

## Screens (v0.1, demo data)

| Feed | Leaderboard | Portfolio |
| --- | --- | --- |
| ![Feed](images/feed.png) | ![Leaderboard](images/leaderboard.png) | ![Portfolio](images/portfolio.png) |

## Page loading boundaries

Route navigation and client queries are separate loading phases. Portfolio and Leaderboard each provide `loading.tsx` (including `AppShell`) and an explicit page-level Suspense fallback (inside the shell). They reuse the same skeletons for initial navigation and data loading; no fabricated balances, ranks or PnL appear while pending. Both use the shared theme and disable pulse animation for reduced-motion preferences.

```mermaid
flowchart LR
  NAV[Open Portfolio / Leaderboard] --> ROUTE[Route loading.tsx + shell]
  ROUTE --> PAGE[Page Suspense boundary]
  PAGE --> AUTH{Portfolio auth ready?}
  AUTH -- no --> PS[Portfolio metric / overview skeleton]
  AUTH -- signed out --> GATE[Honest demo or sign-in guidance]
  AUTH -- signed in --> PQ[Portfolio query]
  PQ -- pending --> PS
  PAGE --> LQ[Leaderboard query + active window controls]
  LQ -- pending --> LS[Ranking row skeletons]
  PQ -- success --> DATA[Actual snapshot or empty state]
  LQ -- success --> DATA
  PQ -- error --> RETRY[Error guidance + Retry]
  LQ -- error --> RETRY
  DATA -- background refetch --> KEEP[Keep loaded content + updating status]
```

- Portfolio waits for authentication before revealing user data. A disabled signed-out query is not mistaken for loading. Its metric grid and overview placeholders match the compact loaded layout; authenticated failures retain a Retry action.
- Leaderboard keeps 24h / 7d / 30d controls interactive while its eight skeleton rows load, with one screen-reader status. Background refreshes keep the last rows visible; failed refreshes explicitly label that snapshot. Ranking-window links, follow gates and source labels remain unchanged.
- Route audit: `/` is a static landing page with no blocking data query; `/trade/[mint]` already has the persistent layout and full workspace/panel fallbacks. Feed and trader profile loading/polish are owned by Design's parallel follow-up; the existing profile route already has a structured Suspense fallback.

## Terminal component tree

```mermaid
flowchart TB
  LAYOUT["app/trade/layout.tsx (persistent)"] --> SHELL[AppShell]
  SHELL --> TOP[TopBar]
  SHELL --> STRIP[StatusStrip]
  SHELL --> SD[SearchDialog]
  LAYOUT --> INITIAL["Suspense → terminal skeleton"]
  INITIAL --> ROUTE["TerminalRoute / useParams"] --> TERM[Terminal]
  TERM --> L[Markets 200–380px, collapsible]
  TERM --> M[Center, flexible]
  TERM --> R[Order rail 260–440px]
  L --> EXP[MarketExplorer<br/>filter, Supported / Watchlist]
  M --> SUM[AssetSummary]
  M --> CH[PriceChart<br/>lightweight-charts]
  M --> ACT[ActivityPanel<br/>Trades / Holders / Positions / My swaps / Traders / Top traders / Thesis]
  ACT --> TT[TopTraders]
  R --> OT[OrderTicket] --> QR[QuoteReviewDialog]
  R --> MC[MarketContext]
  TERM -. "below md" .-> SHEET[Buy / Sell bar → bottom sheet with OrderTicket]
```

### Resizable terminal

At desktop widths the explorer uses the full left column; global Top traders lives in the lower tab strip, separate from token-specific Traders. The chart/activity and order/context pairs have independent vertical splitters. Below 1024px the explorer is hidden; below 768px the chart and activity stack with Buy/Sell sheets instead of a rail. Inner panels scroll without moving the chart or footer. Market identity/stats share one row on wide screens.

```mermaid
flowchart LR
  INPUT["Drag / arrow keys / Shift+arrow"] --> LIMIT["Clamp to viewport and panel minimums"]
  LIMIT --> GRID["Resize columns or chart/activity and order/context split"]
  LIMIT --> SAVE["Local panel preferences"]
  SAVE --> LOAD["Validate on next visit"] --> LIMIT
  RESET["Double-click / Enter"] --> DEFAULT["Restore split default"] --> GRID
  QUERY["Panel request pending"] --> SKEL["Named summary / chart / order / table skeleton"]
  SKEL --> RESULT["Real data, empty state or explicit error"]
```

Splitters expose `separator` roles, names, controlled regions, orientation and bounded pixel values. Home/End move to the limits; Enter/double-click resets that split. Column limits reserve at least 360px for the center using the active viewport breakpoint and the opposite column’s width, including at exactly 1024px. Preference storage is optional and malformed saved values are ignored or bounded. Layout has no new dependency. Skeletons reserve structure, announce loading to assistive technology and respect reduced motion; no synthetic chart or balance values are presented as data. Existing demo and wallet-signing gates remain unchanged.

The shared `/trade` layout owns the shell and terminal across mint routes. It server-renders a responsive workspace skeleton until hydration, then reads `useParams` in the client-only workspace. Its Suspense boundary uses the same skeleton. Client-side token navigation updates the mint without remounting the workspace, keeping explorer filters/collapse, splitters, chart instance and activity tabs in place. Token-specific query keys refresh the summary, chart, activity and order context; order forms are keyed by mint so old amounts/reviews cannot carry into a different token.

## Data flow

See [live data flow](live-data.md) for price/leaderboard subscriptions, cache recovery, demo/trading gates, and a mock-mode screenshot.

```mermaid
flowchart LR
  API[(Agele API<br/>REST /v1)] -- "openapi-fetch<br/>typed by schema.d.ts" --> Q[TanStack Query cache]
  WS[(WS gateway process<br/>:4001/ws)] -- "token:&lt;mint&gt;:trades" --> RT[lib/realtime.ts<br/>one socket, backoff, resubscribe]
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

[Sage / Ink](brand.md), dark only: warm ink workspace, pastel-green identity, Manrope UI and Geist Mono data. Semantic tokens live in `src/app/globals.css`; dedicated sRGB aliases feed the chart canvas. Direction and selection never rely on colour alone. Existing screenshots above predate the brand refresh.
