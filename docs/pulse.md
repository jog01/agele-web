# Pulse

Pulse uses one market lifecycle API in both modes. In demo mode, the backend simulator
produces the launch, trade and migration events; the browser does not generate tokens
or classify a launch as nearing migration independently of the API.

```mermaid
flowchart LR
  Demo[Demo chain simulator] --> Ingest[Shared chain ingest]
  Live[Solana indexer] --> Ingest
  Ingest --> Projection[Pulse projection]
  Projection --> REST["GET /v1/pulse"]
  Projection --> WS["WebSocket: pulse"]
  REST --> Cache[TanStack Query cache]
  WS --> Cache
  Cache --> Board["/pulse: New, Final stretch, Migrated"]
```

```mermaid
sequenceDiagram
  participant Board as Pulse board
  participant Cache as usePulse / Query cache
  participant API as Market API
  Board->>Cache: Mount
  Cache->>API: GET /v1/pulse?limit=30
  Cache->>API: Subscribe to pulse
  API-->>Cache: Source and three token lists
  Cache-->>Board: Render snapshot
  API-->>Cache: Upsert or migration event
  alt Event can be applied to the cached snapshot
    Cache-->>Board: Render updated lists
  else Stage or token is missing
    Cache->>API: Request authoritative snapshot
    API-->>Cache: Refreshed token lists
  end
  Note over Cache,API: Poll periodically and re-snapshot on reconnect.
```
