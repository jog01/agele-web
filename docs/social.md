# Social Surfaces (Feed, Theses & Profiles)

Agele's social layer is backed entirely by the backend social API (`agele/openapi.json`). Demo mode and live mode share the exact same client, TanStack Query cache keys, and components — only the backend data source (`source: "demo" | "indexed"` or `X-Data-Source`) changes.

## Read & Mutation Flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as Feed / ThesisPanel / Profile
  participant RQ as TanStack Query Cache
  participant API as agele Social API

  UI->>RQ: useFeed(scope) / tokenCommentsQuery(mint) / traderProfileQuery(wallet)
  RQ->>API: GET /v1/feed | /v1/tokens/:mint/comments | /v1/traders/:wallet
  API-->>RQ: Cursor page + source / X-Data-Source header
  RQ-->>UI: Render cards, avatars, token logos, counts

  UI->>RQ: useReactToPost(id, liked)
  RQ->>RQ: Optimistic toggle across feed, comments, thread caches
  RQ->>API: PUT/DELETE /v1/posts/:id/reaction (Bearer)
  alt 204 OK
    API-->>RQ: 204 No Content
    RQ->>API: Invalidate viewer-scoped feed & token discussion
  else Error
    API-->>RQ: 4xx/5xx
    RQ->>RQ: Rollback snapshot
  end
```

## Thesis Threads, Versioning & Pinning

```mermaid
flowchart LR
  FeedCard[Feed Thesis Card] -->|Open thread| Sheet[ThesisThreadSheet]
  TokenTab[Token ThesisPanel] -->|Thread| Sheet
  Sheet --> ThreadQ["GET /v1/tokens/:mint/theses/:thesisId"]
  ThreadQ --> Pinned[Pinned version highlight]
  ThreadQ --> Versions[Thesis versions + nested replies]
  Versions -->|Author only| Pin["PUT/DELETE /v1/posts/:id/pin"]
  Versions -->|Reply| Comment["POST /v1/tokens/:mint/comments (parentId)"]
  TokenTab -->|New thesis| Thesis["POST /v1/tokens/:mint/theses"]
  FeedCard -->|Write thesis| Thesis
```

## Cache Isolation & Provenance

- **Viewer isolation:** All social queries include `socialViewer(auth)` in their query keys so `isFollowing` and `likedByMe` never leak across sign-out or account switches.
- **Provenance:** Feed items carry `source: "demo" | "indexed"`; profiles and trades carry `X-Data-Source`. UI surfaces subtle provenance captions (`Demo traders · simulated activity`, `Demo profile`) without blocking seeded demo positions, trades, or theses.
- **Token imagery:** Token chips render API-provided `imageUrl` via `AssetAvatar` (falling back to `TokenAssetAvatar` or the generic `Coins` glyph, never text initials).
