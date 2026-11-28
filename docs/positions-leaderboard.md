# Positions leaderboard

Open **Leaderboard → Positions** to compare profitable, fully closed positions. The window is based on close time. Invested buckets are lower-inclusive and upper-exclusive; the dual-thumb hold-time filter omits the upper bound at **3m+**. The API filters before ranking by realized PnL in USD and paginating. Demo positions come from the same API and are marked **Demo fixtures**.

```mermaid
flowchart TD
  Leaderboard --> Traders["Traders · default"]
  Leaderboard --> Positions["Positions · ?tab=positions"]
  Positions --> Filters["Window · invested USD · hold time"]
  Filters --> Rankings["API ranks matching closed positions"]
  Rankings --> Results["Ranked positions · next cursor"]
  Results -->|Trader| Profile["Public trader profile"]
  Results -->|Position row| Replay["Replay for the exact position episode"]
```

```mermaid
sequenceDiagram
  actor Viewer
  participant Board as Positions panel
  participant Query as TanStack Query
  participant API as Agele API
  participant Replay as Position replay
  Viewer->>Board: Change window, bucket or hold range
  Board->>Query: Select query keyed by filters
  Query->>API: GET /v1/leaderboard/positions with filters
  API-->>Query: Ranked entries, nextCursor, X-Data-Source
  Query-->>Board: Render current filter results
  opt More positions available
    Viewer->>Board: Load more
    Query->>API: Same filters and next cursor
    API-->>Board: Append the next ranked page
  end
  Viewer->>Board: Open a position
  Board->>Replay: URL contains wallet, mint and positionId
  Replay->>API: GET /v1/traders/{wallet}/positions/{mint}?positionId=…
  API-->>Replay: Exact episode and fills
```
