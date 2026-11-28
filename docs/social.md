# Social Surfaces (Feed, Theses & Profiles)

Agele's social layer is backed entirely by the backend social API (`agele/openapi.json`). Demo mode and live mode share the exact same client, TanStack Query cache keys, and components — only the backend data source (`source: "demo" | "indexed"` or `X-Data-Source`) changes.

## Read & Mutation Flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as Feed / ThesisPanel / Profile
  participant RQ as TanStack Query Cache
  participant API as agele Social API

  UI->>RQ: useFeed(scope, filters) / tokenCommentsQuery(mint) / traderProfileQuery(wallet)
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

## Feed Filters

```mermaid
flowchart LR
  Scope["Global / Following"] --> Stored["Load applied filters for this scope from local storage"]
  Stored --> Draft["Filter sheet: edit or reset draft"]
  Stored --> Query
  Draft -->|Apply valid draft| Save["Save applied values for this scope"]
  Draft -->|Close without applying| Stored
  Save --> Query["Query key: feed, viewer, scope, filter parameters"]
  Query --> Api["GET /v1/feed with types, USD bounds and cursor"]
  Api --> Rows["Render API rows and retain the next cursor"]
  Rows -->|Load more| Query
```

All activity sends all supported types explicitly, including closed trades, milestones,
multi-user trades, and new traders. Trades and Theses are shortcuts for the same
activity checklist. The API applies the selection and USD bounds before returning
each page; the browser stores only filter preferences, never demo feed data.

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
- **Provenance:** Feed items carry `source: "demo" | "indexed"`; profiles and trades carry `X-Data-Source`. Trade attachments show whether activity is simulated or indexed without a separate feed banner.
- **Token imagery:** Token chips render API-provided `imageUrl` via `AssetAvatar` (falling back to `TokenAssetAvatar` or the generic `Coins` glyph, never text initials).
