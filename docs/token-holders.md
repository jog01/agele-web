# Token holders

The Holders tab opens on **All holders** (the largest owner wallets). **Agele traders** shows traders with an open indexed position in the token, ordered by holding amount. Known traders with a public wallet link to their profiles; unidentified wallets link to the explorer. Position value and token balance are snapshot values. **Avg. hold** is the trader's average across closed positions; **Hold age** is time since the current position's first buy. Selecting the invested amount opens the matching position replay; selecting the latest thesis opens its thread.

**Thesis only**, **Following only**, and **Min size (USD)** can be combined within either scope. The USD minimum applies to current holding value, not invested cost. The backend applies filters before the response limit, within the market snapshot or the indexed trader candidate set. Following is only available to a signed-in viewer with a wallet. Query results are keyed by mint, viewer, scope and filters. Demo and indexed markets use the same API; the browser does not generate holder data.

```mermaid
flowchart TD
  A[Open Holders tab] --> B[Select scope and optional filters]
  B --> C[Load holder snapshot for mint, viewer and filters]
  C -->|Pending| D[Show skeletons]
  C -->|Error| E[Show error and retry]
  C -->|No matches| F[Show filter-specific empty state]
  C -->|Matches| G[Render holders with available position and thesis context]
  G -->|Select trader| H[Trader profile]
  G -->|Select invested amount| J[Position replay]
  G -->|Select latest thesis| I[Thesis thread sheet]
```

```mermaid
sequenceDiagram
  actor Viewer
  participant Panel as Holders tab
  participant API as Agele API
  Viewer->>Panel: Choose scope and filters
  opt Following only
    Panel->>Panel: Resolve viewer bearer token
  end
  Panel->>API: GET /v1/tokens/{mint}/holders with filters
  API->>API: Filter eligible holders before applying the limit
  API-->>Panel: Snapshot and holder rows
  opt Latest thesis selected
    Viewer->>Panel: Open thesis preview
    Panel->>API: GET /v1/tokens/{mint}/theses/{thesisId}
    API-->>Panel: Thesis thread
  end
```
