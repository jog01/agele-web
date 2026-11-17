# Live data

## Snapshot → stream → recover

```mermaid
sequenceDiagram
    participant H as Hooks
    participant A as API (REST + WS)
    participant Q as Query cache
    participant UI as Components
    H->>A: REST token/trending + leaderboard snapshots
    A-->>Q: Initial data
    H->>A: WS subscribe token:<mint>:price
    H->>A: WS subscribe leaderboard:global
    A-->>H: Price tick (mint, priceUsd, marketCapUsd, time)
    H->>Q: Validate + merge matching detail/trending entries
    Note over H,Q: Reject wrong mint and older cached ticks
    A-->>H: Leaderboard signal (window, updatedAt)
    H->>Q: Invalidate [leaderboard, window]
    Q->>A: Refetch active invalidated queries
    Q-->>UI: Render updated data
    Note over H,A: Connection lost → backoff → reconnect
    H->>A: Re-subscribe once per topic
    H->>Q: Invalidate subscribed tokens, trending, all leaderboard windows
    Q->>A: Refetch active snapshots
```

Inactive invalidated queries refresh when observed again. REST polling remains a fallback.

## Client wiring

```mermaid
flowchart LR
    REST[REST snapshots] --> Q[TanStack Query cache]
    WS[One multiplexed WebSocket] --> P[useLivePrices]
    WS --> L[useLiveLeaderboard]
    P -->|Validated price merge| Q
    L -->|Window invalidation| Q
    Q --> T[useToken / useTrending]
    Q --> B[useLeaderboard]
    T --> C[Existing token consumers]
    B --> V[Top traders / leaderboard view]
    P -->|Reconnect invalidation| Q
    L -->|Reconnect invalidation| Q
```

## Demo labels and trading gate

```mermaid
flowchart TD
    H[GET /health every 30s] --> S{Valid marketData?}
    S -->|live| LIVE[Source: live]
    S -->|mock, missing, invalid, pending or request failure| MOCK[Source: mock]
    LIVE --> AUTH{Privy configured?}
    MOCK --> DEMO[Show demo labels; disable confirmation]
    AUTH -->|No| DEMO
    AUTH -->|Yes| REAL[Hide demo labels]
    REAL --> READY{Auth ready and authenticated?}
    READY -->|No| DISABLED[Disable confirmation]
    READY -->|Yes| ENABLED[Confirmation gate open]
```

An open gate does not implement swaps: confirmation currently has no submission handler.
The source strip reflects market data only. The chart's static demo caption is still owned by the chart workstream.
Live candles/trades require a Birdeye key: a 503 shows “Chart data unavailable”; the activity table has no explicit error state.

## Feed and follows

```mermaid
flowchart LR
    S[Global / Following] --> A{Following and signed out?}
    A -->|Yes| LOGIN[Sign-in prompt; no feed request]
    A -->|No| GET[GET /v1/feed with bearer token when signed in]
    GET --> CACHE[Viewer and scope isolated infinite query]
    CACHE --> ITEMS[Demo thesis / trade cards]
    CACHE --> CURSOR{nextCursor?}
    CURSOR -->|Opaque cursor| MORE[Load more with unchanged cursor]
    MORE --> GET
    CURSOR -->|null| END[No more pages]
    F[Existing Follow / Unfollow button] --> OPT[Optimistic leaderboard isFollowing]
    OPT --> MUT[Authenticated PUT / DELETE follows wallet]
    MUT -->|Error| ROLLBACK[Restore wallet follow state]
    MUT --> REFRESH[Invalidate viewer leaderboard and Following feed]
    ROLLBACK --> REFRESH
```

Feed content stays labelled **demo** until backend trade indexing lands, even when market prices are live.
Signed-out leaderboard results do not include follow state. Follow mutations require auth and accept 204 without a response body.

## Mock-mode trade page

Captured from this repository's dev server on port 3000 with the mock API on port 4000 and Privy unconfigured.
This screenshot demonstrates the UI, not production/live-provider delivery.

![Trade page with mock market data and demo trading labels](images/trade-mock.png)
