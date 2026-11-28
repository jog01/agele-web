# Token holders

The Holders tab shows the API's largest owner wallets for a token. Known traders link to their profiles; unknown wallets link to the explorer. Position value and token balance are snapshot values. **Hold age** is time since the position's first buy, not an estimated average. The latest thesis is nested in its holder's row; selecting it opens the existing thesis thread sheet.

**Thesis only**, **Following only**, and **Min size (USD)** can be combined. The USD minimum applies to current holding value, not invested cost. The backend applies filters before the response limit. Following is only available to a signed-in viewer with a wallet. Query results are keyed by mint, viewer and filters. Demo and indexed markets use the same API; the browser does not generate holder data.

```mermaid
flowchart TD
  A[Open Holders tab] --> B[Select optional filters]
  B --> C[Load holder snapshot for mint, viewer and filters]
  C -->|Pending| D[Show skeletons]
  C -->|Error| E[Show error and retry]
  C -->|No matches| F[Show filter-specific empty state]
  C -->|Matches| G[Render holders with available position and thesis context]
  G -->|Select trader| H[Trader profile]
  G -->|Select latest thesis| I[Thesis thread sheet]
```

```mermaid
sequenceDiagram
  actor Viewer
  participant Panel as Holders tab
  participant API as Agele API
  Viewer->>Panel: Choose filters
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
