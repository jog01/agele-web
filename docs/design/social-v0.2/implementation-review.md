# Fomo parity and Agele polish review

Review date: 28 November 2026. This complements the [CTO's screen-by-screen roadmap](https://github.com/jog01/agele-web/blob/main/docs/fomo-parity.md); it does not replace its implementation order.

This is a baseline review for work in progress, not final release QA. Final visual/logo and interaction sign-off belongs after the new social features are integrated.

The reference set includes Jogeshwar's four screenshots and the official guides below. The CTO owns the separate signed-in Fomo walkthrough. This design session inspected current Agele and public Fomo material, not the owner's Fomo account.

## Evidence and scope

- Agele web revision: `164abca2bf1bd2148e454cac093a449e357d9eba`.
- Agele API revision: `468f4760e0dc8f7b5cb76c2ef642acd643c195ff`.
- Use real PostgreSQL demo seeds through the API, not browser fixtures or the static design renderer.
- Browser targets: 1440px desktop and 390px mobile emulation. Mobile emulation is not an iOS hardware test.
- Do not treat an unmerged implementation branch or a design board as shipped functionality. Newer profile/replay work must be checked again after it lands.

**Status definitions:** present means the named UI exists; partial means some of that flow exists; missing means it was absent at the audited revision; unverified means the required state or verification was unavailable. Browser evidence and source evidence are identified separately.

## Current-main feature matrix

| Surface | Status | Evidence at the audited revision | Acceptance target |
| --- | --- | --- | --- |
| Profile identity | Present | Browser: seeded Nora/@northstar profile loaded. Source: display name, @handle, bio and both relationship counts exist. | Preserve compact identity and honest demo/source labels. Counts must eventually open their relationship lists. |
| Profile performance and activity | Missing | Browser: no profile chart, best-trades strip, closed-position toggle or profile thesis feed. Source: open positions and recent fills render below window metrics. | Build profile v2 in the CTO's order. Scope chart and metrics to the same period; link best/closed positions to trader detail. Do not draw a fabricated curve. |
| Selected trader position | Missing | Browser: seeded profile positions/fills open generic `/trade/:mint`, not the selected trader's position. | Keep wallet, mint and position/fill identity in the URL and sheet. Show B/S markers, average entry/exit, actual result, transactions and thesis context. |
| Deterministic replay and share card | Missing | No trader-position replay entry from the observed profile. A generic token chart is not a replay. | Implement [boards 04/05/08](README.md#boards). Playback is an Agele requirement; the supplied Fomo evidence establishes position charts/fills, not verified Fomo playback. |
| Global/Following feed | Partial | Source: scope and All/Trades/Theses controls exist. Browser: a position-bound thesis is labelled "Thesis · no trade attached". | Retain identity-first cards. Show the actual attached position, truthful size/PnL, server-backed size/portfolio/MC filters and correct position destinations. |
| Thesis versions and replies | Partial | Browser: seeded SOL thread loads its pinned entry, reply and older update. Share loses thread identity; the mobile sheet is narrow. Authenticated mutations were not exercised. | Retain version order and nested replies, preserve the selected thread on share/refresh, and fix the mobile sheet/actions. |
| Shared search | Partial | Browser: desktop autofocus, token keyboard selection and Enter navigation work. A `northstar` query shows no markets and a leaderboard link, not a trader. No recents/Clear-all workflow. Source: text search filters trending tokens; direct mint lookup uses the API. | Use [board 11](11-search-discovery.png). Search the supported API universe, show recent navigation separately, and distinguish token and trader destinations. Restore focus on close. |
| Relationships and alerts | Partial | Source: follow control and relationship totals exist; totals are spans, not list triggers. No mutuals, follow-back or per-trader alert controls. | Add lists/states from real relationship data. Keep unfollow, alerts and trading separate. |
| Token holders with theses | Partial | Source: holders table has owner wallet, amount, supply share and USD value. Wallets link to an explorer; no thesis preview or Following/Thesis-only filter. | Connect known traders to their profiles and actual position/thesis context. Keep unknown holders honest. |
| Leaderboard | Partial | Source: trader rankings with 24h/7d/30d windows and follow controls. No Positions tab, all-time window, own-rank card or Following filter. | Follow the CTO's Positions leaderboard scope; hold time/invested filters must operate over the full server result, not just loaded rows. |
| Notification center | Missing | Source: no notification center implementation at this revision. | This is an Agele continuation, not a proven missing Fomo web feature. Support unread state, pagination and exact thesis/comment deep links when built. |
| Pulse implementation branch | Unverified | [Pulse PR #39](https://github.com/jog01/agele-web/pull/39) is separate from the audited checkout. | Recheck after its API dependency lands. Preserve backend lifecycle buckets, 24h volume and distinct mint identities. |
| Authenticated mutations | Unverified | This audit is read-only and the build has no configured sign-in. | Follow, like, publish, pin, reply and notification mutations require separate authenticated verification; do not describe the gates as tested mutations. |

Browser also confirmed that Trades/Theses filtering changes activity, Following explains its signed-out gate, token thesis entries finish loading, and leaderboard 30d → 24h changes URL state and the rendered data. Discovery/holders rows above are source-backed; the browser additionally confirmed reachable holder and trader tables.

## Blocking polish findings

### Position context must be truthful

`feedItemContent()` hard-codes "Thesis · no trade attached" even though the feed schema carries `positionId`. This contradicts both the backend relationship and the position-bound thesis design. Render the linked position context returned by the API; if its summary cannot load, say "Position details unavailable" and retain the identifier/link. Do not tell readers that the author has no attached trade.

Source: [`social.ts:80–98`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/lib/api/social.ts#L80-L98), [`schema.d.ts:2559–2568`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/lib/api/schema.d.ts#L2559-L2568).

### Do not lose the selected trader or conversation

The current share action copies a generic token page for a thesis and a profile for a trade. The token attachment also opens the generic market. Those destinations discard the selected position/thesis context.

Use a canonical position/thread URL that survives refresh and copy/paste. Back/close must return to the originating feed/profile and preserve its scroll/filter state. The viewer's own Buy/Sell starts a fresh quote; it must never imply the trader's historical execution price is available now.

Source: [`feed-view.tsx:211–214`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/components/feed/feed-view.tsx#L211-L214), [`trader-profile-view.tsx:109–132`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/components/traders/trader-profile-view.tsx#L109-L132).

### Mobile sheet width and targets

At a 390px viewport, the thread sheet measures only 292.5px wide. The measured Like target is 25.2 × 16px, Reply 48.6 × 16px, Close 28 × 28px and Sign in 86.1 × 28px. Token tabs are 25px high. These are measured hit areas, not just small icons inside larger buttons.

Use the full available sheet width on mobile and apply the desktop max width only above the appropriate breakpoint. Give controls actual 44px non-overlapping targets without making every visible icon large. Retain a clear inner scroller and safe-area-aware composer.

Source: `src/components/ui/sheet.tsx:65`, `src/components/social/thesis-thread-sheet.tsx:40` and its action controls.

### Actual input size on touch

With `(pointer: coarse)` true, the feed thesis composer, token thesis textarea and thread reply textarea each compute to 14px. Set these editors to an actual 16px on coarse-pointer devices, including tablets; keep compact display typography without enlarging the whole terminal. Actual iOS zoom behavior was not tested.

Source: [`feed-view.tsx:144–150`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/components/feed/feed-view.tsx#L144-L150), `src/components/terminal/thesis-panel.tsx:180–190`, [`thesis-thread-sheet.tsx:309–315`](https://github.com/jog01/agele-web/blob/164abca2bf1bd2148e454cac093a449e357d9eba/src/components/social/thesis-thread-sheet.tsx#L309-L315).

### Restore the opening control's focus

Search and the thesis thread close with Escape, but after their close transitions complete, `document.activeElement` settles on BODY. Search reproduces this even when its trigger was explicitly focused before opening. Capture a stable opening element or use the dialog's trigger/ref restoration mechanism; closing must return keyboard users to that control, not the document body.

Source: `src/components/shell/app-shell.tsx:25,48`, `src/components/terminal/search-dialog.tsx:48`, `src/components/social/thesis-thread-sheet.tsx:38–40`.

## Layout regression and limits

The generic token chart survived a 1440 → 390 → 1440 resize round-trip. Its main canvas changed from 798 × 476 to 296 × 232 and back; the mobile document remained 390px wide without page-level horizontal overflow. This proves that limited resize regression only, not trader replay or long-duration stability. The mobile leaderboard still needs internal horizontal scrolling for later columns/actions.

Token Traders labels seeded results "Indexed data" while other surfaces disclose demo more explicitly. Keep source terminology consistent rather than implying live indexed trading. A local Next development warning mentioned injected `devin-hidden` attributes; production impact was not established.

Long-duration chart jitter/CLS, real iOS hardware, authenticated mutations and unmerged social implementation branches remain unverified. No trades, funds movement, Fomo login or app edits were performed for this baseline audit. No recording was made.

## Visual sign-off for the next implementation

1. Keep the existing green/graphite palette, Manrope, mono financial values and circular API artwork. Do not copy Fomo's accent palette or add decorative gradients/glow.
2. Lead profile/detail with the trader and selected position. Show four useful summary metrics before progressively disclosed tables; do not stack every statistic into the header.
3. Use one dominant chart, restrained borders and stable numeric columns. Preserve current data during background refresh; a new query must not clear the whole page.
4. Keep desktop shell/explorer density consistent across trading and social views. Hide secondary rails before squeezing the primary content on narrow screens.
5. Keep 390px pages free of horizontal document overflow. A table may scroll internally; a sheet has one clear content scroller and actions above the safe area/keyboard.
6. Trade size, position values and SOL PnL need explicit units from the API. Current feed/profile display USD; do not convert historical trades with today's SOL price. USD market cap/volume remain labelled.
7. Unsupported numbers, verification, team badges, ranks and history remain unavailable until returned by the API. Demo labels do not excuse invented runtime data.
8. New live activity should not move the item someone is reading. Use a deliberate new-activity affordance; reduced motion disables nonessential movement and replay autoplay.

## Official reference catalog

These sources expand the audit beyond the supplied screenshots. A mobile feature is not automatically a Fomo web feature or an Agele commitment.

| Official source | Confirmed reference and Agele implication |
| --- | --- |
| [Social guide](https://fomo.family/blog/guide/leveraging-fomos-social-features), [February recap](https://fomo.family/blog/news/february-2026-recap) | Public trading activity, position theses in global/token/profile feeds, engagement and changes since first purchase. Keep identity and position context together. |
| [Posting a thesis](https://help.fomo.family/en/articles/14436863-posting-a-thesis) | 3,000 characters; position automatically attached; history; updates while open and up to three hours after close; holders context; position-size filters and moderation. Unique-session views are documented for web, not mobile. |
| [Following](https://help.fomo.family/en/articles/14436869-following-other-traders) | Relationship lists, Follow back, Following leaderboard and trade-size/per-trader alert controls. |
| [Leaderboard](https://help.fomo.family/en/articles/14436887-leaderboard), [Positions](https://help.fomo.family/en/articles/17983941-the-positions-leaderboard) | Trader and profitable fully closed-position rankings; 24h/7d/30d/all-time windows; Following/invested/hold-time filters. Top 100 badges follow actual all-time rank. Do not fabricate badges. |
| [Discover web](https://help.fomo.family/en/articles/18098507-discover-on-the-fomo-web-app) | Live tables with timeframe, cap/volume/network filters, latest thesis, watchlist/hidden tokens, quick buy, split tables, side panels and floating thesis windows. Agele's explorer/watchlist are only part of this interaction set. |
| [Navigation](https://help.fomo.family/en/articles/14430486-navigating-the-app), [Using web](https://help.fomo.family/en/articles/17831976-using-fomo-on-the-web) | Mobile search includes tokens, traders, perps and clans; paste and direct token entry are supported. Agele keeps only supported entity/market types, not placeholder perps/clans. |
| [Notification settings](https://help.fomo.family/en/articles/14436883-notifications), [Notification Center](https://fomo.family/blog/news/notification-center-on-fomo) | Following/price/trending/top-trader/follower categories and direct conversation links. The November 15 center article explicitly says iOS/Android, not web. Agele web notifications are a deliberate extension. |
| [Clans](https://help.fomo.family/en/articles/17831973-clans) | Combined holdings/PnL, member lists, Feed/Thesis tabs, follow-all and invitation management. The guide's mobile navigation does not prove web absence. Keep this P2 under the CTO roadmap. |
| [Creator rewards](https://help.fomo.family/en/articles/17832635-creator-rewards) | Fees attributed to trades after viewing a post, profile or position; not a payment for following or posting alone. Rewards/referrals remain outside this design implementation. |
| [Copy trading](https://help.fomo.family/en/articles/15171239-does-fomo-have-copy-trading), [Release notes](https://fomo.family/release-notes) | Fomo explicitly has no automatic copy trading. Agele's social Buy is the viewer's independent quote; replay is a separate Agele product decision. |

## Handoff

Frontend owns app components, routes, API hooks and interactions; Backend owns data/contracts and demo seeding. Use the CTO's position detail → profile → holders → feed → leaderboard → search/notifications order. The findings above are acceptance criteria, not a competing feature roadmap.

Recheck the implemented flows on their final revisions with real seeded positions/threads and authenticated gates. This document does not sign off unbuilt views or the owner's live account.
