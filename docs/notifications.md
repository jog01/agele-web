# Notification center

The header bell opens a right-hand drawer (432px on desktop, full width on small
screens). The timeline keeps server order and groups items into Today, This week
(starting Monday), and Earlier in the viewer’s local time. Opening a notification
never places a trade.

```mermaid
flowchart LR
  API["Paginated notification inbox"] --> Timeline["Today / This week / Earlier"]
  Timeline --> Thesis["Liked thesis version or exact reply"]
  Timeline --> Trade["Position replay when an episode is available"]
  Timeline --> Profile["Follower profile"]
  Timeline --> Leaderboard["Leaderboard window"]
  Timeline --> Read["Mark an opened item or the whole inbox read"]
```

## API and synchronization

- `GET /v1/me/notifications?limit=25&cursor=…` returns `{source, items, nextCursor}`.
  The server owns ordering, grouping, timestamps, actor counts, and read status.
- Under the same prefix, `GET /unread-count`, `PUT /{id}/read`, and `PUT /read-all`
  return the updated unread count. `GET /settings` returns `{traderActivity,sound}`
  and `PUT /settings` replaces both values.
- The private socket authenticates with a fresh Privy access token and subscribes
  to `user:<wallet>:notifications`. A `{type: "changed"}` event refreshes inbox,
  unread count, and settings. The inbox also polls while open and refreshes on
  window focus.
- All notification routes require a bearer, including in demo mode. The backend
  copies its seed inbox for each signed-in demo account so read state is private.
  There are no browser-side demo fixtures.
- Device audio requires a browser gesture, even when the synced sound preference
  is already enabled. Once armed, sound plays for new trade notifications when
  the account’s sound setting is on, not for changes to existing items.

Thesis notifications use the supplied mint and thesis ID to open the thread and
focus the post or reply in `target.commentId`. The actor is not the thesis owner.
Trade notifications use the supplied wallet, mint, and position episode ID. When
that ID is absent, the row stays informational instead of opening a different episode.

## Design gaps in the current backend contract

Alert settings do not provide minimum trade size or per-trader enable/pause.
Trader alerts include an episode ID when available, not the alerted fill ID or
transaction signature. Clan invites and sends are not notification kinds in this
contract.

```mermaid
sequenceDiagram
  actor Viewer
  participant Web as Notification center
  participant API as Agele REST API
  participant WS as Private alerts socket
  Viewer->>Web: Open drawer
  opt Signed-in account
    Web->>API: GET /v1/me/notifications
    API-->>Web: source, items, nextCursor
    Web->>API: GET /v1/me
    API-->>Web: Account wallet and linked wallets
    Web->>WS: Authenticate with Privy token
    WS-->>Web: authenticated
    Web->>WS: Subscribe to user:<wallet>:notifications
    Viewer->>Web: Change alert settings
    Web->>API: PUT /v1/me/notifications/settings
    WS-->>Web: changed
    Web->>API: Refresh inbox, unread count and settings
  end
```
