"use client";

import { BadgeCheck, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { type ActiveThesisThread, ThesisThreadSheet } from "@/components/social/thesis-thread-sheet";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNow } from "@/hooks/use-now";
import { useTokenHolders, useTokenPosition, useTokenTraders } from "@/hooks/use-token-activity";
import { ApiError } from "@/lib/api/client";
import type { TokenHolder } from "@/lib/api/token-holders";
import {
  changeTone,
  DASH,
  formatAmount,
  formatCompact,
  formatCompactUsd,
  formatPct,
  formatPrice,
  formatUsd,
  shortAddress,
  timeAgo,
  utcTimestamp,
} from "@/lib/format";
import { TableSkeleton } from "./panel-skeleton";

const minimumHolderSizes = [
  { value: "", label: "Any" },
  { value: "100", label: "$100" },
  { value: "1000", label: "$1K" },
  { value: "10000", label: "$10K" },
];

export function HoldersPanel({ mint }: { mint: string }) {
  const auth = useAuth();
  const viewer = auth.authenticated ? auth.walletAddress : null;
  const [thesisOnly, setThesisOnly] = useState(false);
  const [followingViewer, setFollowingViewer] = useState<string | null>(null);
  const [minimum, setMinimum] = useState("");
  const [thread, setThread] = useState<ActiveThesisThread | null>(null);
  const followingOnly = Boolean(viewer && followingViewer === viewer);
  const query = useTokenHolders(mint, {
    ...(thesisOnly && { thesisOnly }),
    ...(followingOnly && { followingOnly }),
    ...(minimum && { minValueUsd: Number(minimum) }),
  });
  const now = useNow(30_000);

  return (
    <div className="@container space-y-3 pb-3">
      <div className="flex flex-wrap items-center gap-2 border-border/60 border-b px-3 py-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 text-xs aria-pressed:border-primary/30 aria-pressed:bg-primary/10 aria-pressed:text-primary sm:h-8"
          aria-pressed={thesisOnly}
          onClick={() => setThesisOnly(!thesisOnly)}
        >
          Thesis only
        </Button>
        {viewer && (
          <Button
            type="button"
            variant="outline"
            className="h-10 text-xs aria-pressed:border-primary/30 aria-pressed:bg-primary/10 aria-pressed:text-primary sm:h-8"
            aria-pressed={followingOnly}
            onClick={() => setFollowingViewer(followingOnly ? null : viewer)}
          >
            Following only
          </Button>
        )}
        <label className="inline-flex items-center gap-2 text-muted-foreground">
          Min size (USD)
          <select
            className="h-10 rounded-md border bg-background px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          >
            {minimumHolderSizes.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {query.isPending ? (
        <TableSkeleton label="Loading holders" columns={4} />
      ) : query.isError ? (
        <div className="space-y-2 px-3">
          <p role="alert">
            {query.error instanceof ApiError && query.error.status === 404
              ? "Token not found."
              : "Holder data temporarily unavailable."}
          </p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 text-muted-foreground">
            <p>
              Holders{" "}
              <span className="tabular font-medium text-foreground">
                {formatCompact(query.data.totalHolders)}
              </span>
            </p>
            <p>
              Top 10 holders{" "}
              <span className="tabular font-medium text-foreground">
                {formatPct(query.data.top10Pct, { signed: false })}
              </span>
            </p>
            <p className="w-full">
              Updated{" "}
              <time dateTime={new Date(query.data.updatedAt * 1000).toISOString()}>
                {utcTimestamp(query.data.updatedAt)}
              </time>{" "}
              · largest owner wallets
            </p>
          </div>
          {query.data.holders.length ? (
            <ul aria-label="Token holders" className="divide-y divide-border/60 border-border/60 border-t">
              {query.data.holders.map((holder) => (
                <HolderRow
                  key={holder.wallet}
                  holder={holder}
                  now={now}
                  onOpenThesis={(thesisId) => setThread({ mint, thesisId })}
                />
              ))}
            </ul>
          ) : (
            <p role="status" className="px-3 py-2 text-muted-foreground">
              {followingOnly
                ? "No one you follow is holding"
                : thesisOnly || minimum
                  ? "No holders match these filters."
                  : "No holder data for this token yet."}
            </p>
          )}
        </>
      )}
      <ThesisThreadSheet thread={thread} onOpenChange={(open) => !open && setThread(null)} />
    </div>
  );
}

function HolderRow({
  holder,
  now,
  onOpenThesis,
}: {
  holder: TokenHolder;
  now: number | null;
  onOpenThesis: (thesisId: string) => void;
}) {
  const { trader, position, latestThesis } = holder;
  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="tabular text-muted-foreground">#{holder.rank}</span>
          {trader ? (
            <>
              <TraderAvatar
                handle={trader.handle}
                displayName={trader.displayName}
                avatarUrl={trader.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <TraderLink
                    wallet={trader.wallet}
                    handle={trader.displayName || `@${trader.handle}`}
                    className="truncate text-sm"
                  />
                  {trader.verified && (
                    <BadgeCheck aria-label="Verified trader" className="size-3.5 shrink-0 text-primary" />
                  )}
                </div>
                {trader.displayName && <p className="truncate text-muted-foreground">@{trader.handle}</p>}
              </div>
            </>
          ) : (
            <a
              className="font-mono text-xs hover:underline"
              href={`https://solscan.io/account/${holder.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(holder.wallet)}
            </a>
          )}
          {holder.isPool && (
            <span className="rounded border px-1.5 py-0.5 text-muted-foreground">
              Pool · {holder.label ?? "Unknown pool"}
            </span>
          )}
        </div>
        <div className="tabular ml-auto text-right">
          <p>
            <span className="text-muted-foreground">Position value </span>
            <span className="font-semibold">{formatUsd(holder.valueUsd)}</span>
          </p>
          <p className="text-muted-foreground">
            {formatAmount(holder.amount)} tokens · {formatPct(holder.pctSupply, { signed: false })} of supply
          </p>
        </div>
      </div>
      {position && (
        <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-2 @lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Invested</dt>
            <dd>{formatCompactUsd(position.investedUsd)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">PnL</dt>
            <dd>
              <Pnl value={position.pnlUsd} />
              {position.pnlPct != null && (
                <span className={changeTone(position.pnlPct)}> · {formatPct(position.pnlPct)}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Avg. entry MC</dt>
            <dd>{formatCompactUsd(position.avgEntryMarketCapUsd)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hold age</dt>
            <dd>
              {position.firstBoughtAt != null && now ? (
                <time
                  dateTime={new Date(position.firstBoughtAt * 1000).toISOString()}
                  title={utcTimestamp(position.firstBoughtAt)}
                >
                  {timeAgo(position.firstBoughtAt, now)}
                </time>
              ) : (
                DASH
              )}
            </dd>
          </div>
        </dl>
      )}
      {latestThesis && (
        <button
          type="button"
          className="block w-full min-w-0 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
          aria-haspopup="dialog"
          onClick={() => onOpenThesis(latestThesis.thesisId)}
        >
          <span className="flex flex-wrap items-center gap-1.5 text-primary">
            <MessageSquareText aria-hidden className="size-3.5" />
            <span className="font-semibold">Thesis</span>
            {now && (
              <time
                dateTime={new Date(latestThesis.createdAt * 1000).toISOString()}
                title={utcTimestamp(latestThesis.createdAt)}
              >
                · {timeAgo(latestThesis.createdAt, now)} ago
              </time>
            )}
          </span>
          <span className="my-1 line-clamp-2 break-words text-foreground">{latestThesis.body}</span>
          <span className="text-muted-foreground">
            {latestThesis.likeCount} {latestThesis.likeCount === 1 ? "like" : "likes"} ·{" "}
            {latestThesis.replyCount} {latestThesis.replyCount === 1 ? "reply" : "replies"}
          </span>
        </button>
      )}
    </li>
  );
}

function Pnl({ value }: { value: number | null }) {
  return (
    <span className={changeTone(value)}>
      {value != null && value > 0 ? "+" : ""}
      {formatUsd(value)}
    </span>
  );
}

function Source({ source }: { source: string }) {
  return (
    <p className="text-muted-foreground text-xs">
      {source === "indexed" ? "Indexed data" : source === "demo" ? "Demo data" : "Data source unavailable"}
    </p>
  );
}

export function PositionsPanel({ mint }: { mint: string }) {
  const auth = useAuth();
  const query = useTokenPosition(mint);
  if (!auth.ready) return <TableSkeleton label="Loading sign-in" columns={4} />;
  if (!auth.authenticated)
    return (
      <div className="space-y-3 p-4">
        <p>Sign in to view your position.</p>
        {auth.configured ? (
          <Button onClick={auth.login}>Sign in</Button>
        ) : (
          <p className="text-muted-foreground">Sign-in is disabled in this demo build.</p>
        )}
      </div>
    );
  if (query.isPending) return <TableSkeleton label="Loading position" columns={4} />;
  if (query.isError)
    return (
      <div className="space-y-2 p-4">
        <p>
          {query.error instanceof ApiError && query.error.status === 404
            ? "Token not found."
            : "Position unavailable. Please try again."}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const position = query.data.position;
  return (
    <div className="space-y-3 p-4">
      <Source source={query.data.dataSource} />
      {position === null ? (
        <p>No position in this token.</p>
      ) : (
        <>
          <p className="flex items-center gap-1.5 font-medium">
            <TokenAssetAvatar mint={position.mint} className="size-4" />
            {position.symbol} · {position.quantity === 0 ? "Closed position" : "Your position"}
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Quantity", formatAmount(position.quantity)],
                ["Average cost", formatPrice(position.avgCostUsd)],
                ["Price", formatPrice(position.priceUsd)],
                ["Value", formatUsd(position.valueUsd)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="tabular">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted-foreground text-xs">Unrealized PnL</dt>
              <dd className="tabular">
                <Pnl value={position.unrealizedPnlUsd} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Realized PnL</dt>
              <dd className="tabular">
                <Pnl value={position.realizedPnlUsd} />
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

export function TradersPanel({ mint }: { mint: string }) {
  const query = useTokenTraders(mint);
  if (query.isPending) return <TableSkeleton label="Loading traders" />;
  if (query.isError && !query.data)
    return (
      <div className="space-y-2 p-4">
        <p>
          {query.error instanceof ApiError && query.error.status === 404
            ? "Token not found."
            : "Traders unavailable. Please try again."}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const pages = query.data?.pages ?? [];
  const traders = pages.flatMap((page) => page.traders);
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-1 px-4">
        <Source
          source={
            pages.every((page) => page.dataSource === pages[0]?.dataSource)
              ? (pages[0]?.dataSource ?? "unknown")
              : "unknown"
          }
        />
        <p className="text-muted-foreground text-xs">
          Ranked by lifetime indexed volume. Rankings may change between pages.
        </p>
      </div>
      {!traders.length ? (
        <p className="px-3">No indexed traders for this token yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Trader</TableHead>
              <TableHead className="text-right">Buys / sells</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {traders.map((trader, index) => (
              <TableRow key={trader.wallet ?? trader.handle} className="h-12 border-border/50">
                <TableCell className="tabular">{index + 1}</TableCell>
                <TableCell>
                  {trader.wallet ? (
                    <a
                      className="hover:underline"
                      href={`https://solscan.io/account/${trader.wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {trader.handle ? `@${trader.handle}` : shortAddress(trader.wallet)}
                      <span className="block font-mono text-muted-foreground text-xs">
                        {shortAddress(trader.wallet)}
                      </span>
                    </a>
                  ) : trader.handle ? (
                    `@${trader.handle}`
                  ) : (
                    "Unknown trader"
                  )}
                </TableCell>
                <TableCell className="tabular text-right">
                  {trader.buys} / {trader.sells}
                </TableCell>
                <TableCell className="tabular text-right">{formatUsd(trader.volumeUsd)}</TableCell>
                <TableCell className="tabular text-right">
                  <Pnl value={trader.pnlUsd} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {query.isError && (
        <p role="alert" className="px-3 text-negative">
          Could not load traders. Try again.
        </p>
      )}
      {query.hasNextPage && (
        <Button
          className="mx-3"
          variant="secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage
            ? "Loading…"
            : query.isFetchNextPageError
              ? "Retry load more"
              : "Load more"}
        </Button>
      )}
    </div>
  );
}
