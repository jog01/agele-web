# Global search

Use **Search Agele** or **/** (also Ctrl/Cmd+K) to find supported Solana
markets and public trader profiles. The dialog uses the same API in demo and
indexed modes. The design target is [board 11](design/social-v0.2/11-search-discovery.png).

An empty query shows trending markets and recent token selections. Only up to
four selected mint addresses are stored locally; token metadata and prices come
from the API/cache. **Clear all** does not change the watchlist.

```mermaid
flowchart TD
  Open[Open global search] --> Input{Query entered?}
  Input -->|No| Discovery[Show recent tokens and trending markets]
  Input -->|Yes| Debounce[Trim and debounce input]
  Debounce --> Search["GET /v1/search?q=..."]
  Debounce -.->|Valid Solana address| Exact["Exact mint lookup via GET /v1/tokens/{mint}"]
  Search --> Results[Show separate Tokens and Traders sections]
  Search -->|Token provider unavailable| Partial[Keep available results and show an inline note]
  Exact --> Results
  Partial --> Results
  Discovery --> Select{Select a result}
  Results --> Select
  Select -->|Token| Trade["Save recent mint and open /trade/[mint]"]
  Select -->|Trader| Profile["Open /traders/[wallet]"]
```

```mermaid
sequenceDiagram
  actor Visitor
  participant Dialog as SearchDialog
  participant Query as TanStack Query
  participant API as Agele API
  participant Router as Next.js router
  Visitor->>Dialog: Type symbol, name, handle, or address
  Dialog->>Query: Debounce trimmed query
  Query->>API: GET /v1/search?q=...
  API-->>Query: tokens, tokensUnavailable, traders
  Query-->>Dialog: Return matching data for this query
  Dialog-->>Visitor: Show sections and any partial-availability note
  Visitor->>Dialog: Select a row or press Enter
  alt Token
    Dialog->>Router: Navigate to /trade/[mint]
  else Trader
    Dialog->>Router: Navigate to /traders/[wallet]
  end
```
