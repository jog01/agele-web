"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Share2, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { CopyAddress } from "@/components/common/copy-address";
import { TraderLink } from "@/components/common/trader-link";
import { OrderTicket, type Side } from "@/components/terminal/order-ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, type Comment, type Token } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { positionDiscussionQuery, thesisThreadQuery } from "@/lib/api/social";
import { positionTransactionsQuery, traderPositionQuery, traderProfileQuery } from "@/lib/api/traders";
import { tokenSupply } from "@/lib/candles";
import {
  changeTone,
  formatCompact,
  formatCompactUsd,
  formatPct,
  formatPrice,
  formatUsd,
  shortAddress,
  utcTimestamp,
} from "@/lib/format";
import { type PositionTarget, positionTarget, positionUrl, type TraderPosition } from "@/lib/position-replay";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal";
import { PositionReplayChart } from "./position-replay-chart";
import { ThesisThreadBody } from "./thesis-thread-sheet";
import "./position-replay.css";

const PAGE_SIZE = 6;
const NO_THESES: Comment[] = [];

async function shareReplay(target: PositionTarget) {
  try {
    await navigator.clipboard.writeText(positionUrl(new URL(window.location.href), target).href);
    toast.success("Replay link copied");
  } catch {
    toast.error("Couldn’t copy the replay link");
  }
}

function ReplaySkeleton() {
  return <Skeleton className="position-replay-loading-panel" />;
}

function PositionFills({ position }: { position: TraderPosition }) {
  const [minSize, setMinSize] = useState("");
  const [page, setPage] = useState(1);
  const size = Number(minSize);
  const minSizeUsd = Number.isFinite(size) && size > 0 ? size : 0;
  const query = useQuery(
    positionTransactionsQuery(position.wallet, position.mint, position.id, {
      page,
      limit: PAGE_SIZE,
      minSizeUsd,
    }),
  );
  const fills = query.data?.transactions ?? [];
  const nextPage = query.data?.nextPage ?? null;
  const lastPage = Math.ceil((query.data?.total ?? 0) / PAGE_SIZE);
  return (
    <section className="position-replay-panel" aria-label="Transactions">
      <div className="position-replay-panel-head">
        <h3>Transactions {query.data && <span>({query.data.total})</span>}</h3>
        <label className="position-replay-filter">
          Min size
          <input
            aria-label="Minimum fill size in USD"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="USD"
            value={minSize}
            onChange={(event) => {
              setMinSize(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {query.isPending ? (
        <div role="status" aria-label="Loading transactions">
          <ReplaySkeleton />
        </div>
      ) : query.isError ? (
        <div className="position-replay-empty" role="alert">
          <p>Couldn’t load transactions.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : fills.length ? (
        <ul className="position-replay-fills">
          {fills.map((fill) => (
            <li key={fill.id}>
              <span className={fill.side === "buy" ? "text-positive" : "text-negative"}>
                {fill.side === "buy" ? "Buy" : "Sell"}
              </span>
              <div>
                <div>
                  {formatCompact(fill.tokenAmount)} at{" "}
                  {fill.marketCapUsd === null
                    ? formatPrice(fill.priceUsd)
                    : `${formatCompactUsd(fill.marketCapUsd)} MC`}
                </div>
                <time dateTime={new Date(fill.time * 1000).toISOString()}>{utcTimestamp(fill.time)}</time>
              </div>
              <span>{formatCompactUsd(fill.valueUsd)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="position-replay-empty">
          {minSizeUsd > 0 ? "No fills meet the minimum size." : "No fills recorded."}
        </p>
      )}
      {(page > 1 || nextPage !== null) && (
        <div className="position-replay-pagination">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            {page}
            {lastPage > 0 && ` / ${lastPage}`}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={nextPage === null}
            onClick={() => nextPage !== null && setPage(nextPage)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}

function TradeDiscussion({ discussionKey }: { discussionKey: string }) {
  const auth = useAuth();
  const query = useInfiniteQuery(positionDiscussionQuery(discussionKey, auth));
  const comments = query.data?.pages.flatMap((page) => page.comments) ?? [];
  return (
    <section className="position-replay-panel" aria-label="Trade discussion">
      <div className="position-replay-panel-head">
        <h3>Trade discussion</h3>
      </div>
      {query.isPending ? (
        <ReplaySkeleton />
      ) : query.isError ? (
        <p role="alert" className="position-replay-empty">
          Couldn’t load the discussion.{" "}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </p>
      ) : comments.length ? (
        <ul className="position-replay-comments">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>@{comment.handle}</strong>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="position-replay-empty">No replies on this trade yet.</p>
      )}
      {query.hasNextPage && (
        <Button
          className="m-3"
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => query.fetchNextPage()}
        >
          Load more replies
        </Button>
      )}
    </section>
  );
}

function PositionDetails({
  position,
  token,
  target,
}: {
  position: TraderPosition;
  token: Token | undefined;
  target: PositionTarget;
}) {
  const auth = useAuth();
  const [side, setSide] = useState<Side | null>(null);
  const watchlist = useTerminalStore((state) => state.watchlist);
  const toggleWatch = useTerminalStore((state) => state.toggleWatch);
  const isWatched = watchlist.includes(position.mint);
  const thesis = useInfiniteQuery(thesisThreadQuery(position.mint, target.thesisId ?? null, auth));
  const firstPage = thesis.data?.pages[0];
  const samePosition = firstPage?.positionId === position.id && firstPage?.wallet === position.wallet;
  const thesisId = samePosition ? target.thesisId : undefined;
  const theses = thesisId
    ? Array.from(
        new Map(
          (
            thesis.data?.pages.flatMap(({ pinned, comments }) =>
              pinned ? [pinned, ...comments] : comments,
            ) ?? []
          )
            .filter((comment) => comment.kind === "thesis")
            .map((comment) => [comment.id, comment]),
        ).values(),
      )
    : NO_THESES;
  const supply = tokenSupply(token);
  const pnl = position.realizedPnlUsd + position.unrealizedPnlUsd;

  return (
    <>
      <div className="position-replay-token">
        <AssetAvatar imageUrl={token?.imageUrl ?? position.imageUrl} className="size-11" />
        <div className="min-w-0">
          <div className="position-replay-token-name">
            <strong>{position.symbol}</strong>
            {token?.name && <span>{token.name}</span>}
            <Badge variant="outline" className={position.closedAt === null ? "position-replay-open" : ""}>
              {position.closedAt === null ? "Open" : "Closed"}
            </Badge>
          </div>
          <CopyAddress address={position.mint} label="Copy token address" />
        </div>
        <div className="position-replay-quote">
          <div>
            {supply === null ? formatPrice(token?.priceUsd) : `${formatCompactUsd(token?.marketCapUsd)} MC`}
          </div>
          {token?.priceChange24hPct != null && (
            <div className={changeTone(token.priceChange24hPct)}>
              {formatPct(token.priceChange24hPct)} <span>24h</span>
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-pressed={isWatched}
          aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          onClick={() => toggleWatch(position.mint)}
        >
          <Star className={cn("size-4", isWatched && "fill-current text-warning")} />
        </Button>
      </div>
      <div className="position-replay-grid">
        <div className="position-replay-main">
          <PositionReplayChart position={position} supply={supply} theses={theses} />
          <section className="position-replay-panel position-replay-thesis" aria-label="Thesis thread">
            <div className="position-replay-panel-head">
              <h3>Thesis thread</h3>
            </div>
            {target.thesisId && thesis.isPending ? (
              <ReplaySkeleton />
            ) : thesisId ? (
              <div className="position-replay-thread-body">
                <ThesisThreadBody thread={{ mint: position.mint, thesisId }} embedded />
              </div>
            ) : target.thesisId && thesis.isError ? (
              <p className="position-replay-empty" role="alert">
                Couldn’t load the thesis.{" "}
                <Button size="sm" variant="outline" onClick={() => thesis.refetch()}>
                  Retry
                </Button>
              </p>
            ) : (
              <p className="position-replay-empty">No thesis linked to this replay.</p>
            )}
          </section>
          {target.discussionKey && !thesisId && <TradeDiscussion discussionKey={target.discussionKey} />}
        </div>
        <div className="position-replay-side">
          <section className="position-replay-panel" aria-label="Position performance">
            <div className="position-replay-panel-head">
              <h3>Position performance</h3>
            </div>
            <dl className="position-replay-stats">
              <div className="position-replay-pnl">
                <dt>Net PnL</dt>
                <dd className={changeTone(pnl)}>
                  {formatUsd(pnl)} <span>{formatPct(position.pnlPct)}</span>
                </dd>
              </div>
              <div>
                <dt>Avg. entry MC</dt>
                <dd>{formatCompactUsd(position.avgEntryMarketCapUsd)}</dd>
              </div>
              <div>
                <dt>Avg. exit MC</dt>
                <dd>{formatCompactUsd(position.avgExitMarketCapUsd)}</dd>
              </div>
              <div>
                <dt>Total invested</dt>
                <dd>{formatUsd(position.totalInvestedUsd)}</dd>
              </div>
            </dl>
            <div className="position-replay-actions">
              <Button
                className="position-replay-buy"
                aria-expanded={side === "buy"}
                disabled={!token}
                onClick={() => setSide(side === "buy" ? null : "buy")}
              >
                Buy
              </Button>
              <Button
                variant="outline"
                aria-expanded={side === "sell"}
                disabled={!token}
                onClick={() => setSide(side === "sell" ? null : "sell")}
              >
                Sell
              </Button>
            </div>
            {side && token && (
              <div className="position-replay-ticket">
                <OrderTicket key={side} token={token} price={token.priceUsd} initialSide={side} />
              </div>
            )}
          </section>
          <PositionFills key={position.id} position={position} />
        </div>
      </div>
    </>
  );
}

function PositionReplay({ target }: { target: PositionTarget }) {
  const auth = useAuth();
  const replay = useQuery(traderPositionQuery(target.wallet, target.mint, target.positionId));
  const { data: token } = useQuery(tokenQueries.detail(target.mint));
  const { data: trader } = useQuery(traderProfileQuery(target.wallet, auth));
  const position = replay.data;
  const missingEpisode =
    position && target.fillId && !position.fills.some((fill) => fill.id === target.fillId);
  const notFound = replay.error instanceof ApiError && replay.error.status === 404;

  return (
    <>
      <header className="position-replay-header">
        <div>
          <DialogTitle>Position replay</DialogTitle>
          <DialogDescription className="sr-only">
            Review the trader’s position, fills, and thesis.
          </DialogDescription>
          <TraderLink
            wallet={target.wallet}
            handle={trader?.handle ?? shortAddress(target.wallet)}
            className="position-replay-trader"
          />
        </div>
        <div className="position-replay-header-actions">
          <Button
            variant="outline"
            size="sm"
            disabled={Boolean(missingEpisode)}
            onClick={() => shareReplay({ ...target, positionId: position?.id ?? target.positionId })}
          >
            <Share2 className="size-3.5" /> Share
          </Button>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/trade/${encodeURIComponent(target.mint)}`} aria-label="Open token in terminal">
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </header>
      <div className="position-replay-scroll">
        {position && !missingEpisode ? (
          <PositionDetails position={position} token={token} target={target} />
        ) : replay.isPending ? (
          <div className="position-replay-grid" role="status" aria-label="Loading position replay">
            <ReplaySkeleton />
            <ReplaySkeleton />
          </div>
        ) : (
          <div className="position-replay-empty" role="alert">
            <p>
              {missingEpisode
                ? "This fill isn’t in the latest position episode."
                : notFound
                  ? "No position found."
                  : "Couldn’t load the position replay."}
            </p>
            {!notFound && !missingEpisode && (
              <Button variant="outline" size="sm" onClick={() => replay.refetch()}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function PositionReplayModal() {
  const target = positionTarget(useSearchParams());
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open) window.history.replaceState(null, "", positionUrl(new URL(window.location.href), null));
      }}
    >
      <DialogContent
        className="position-replay"
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
          opener.current = null;
        }}
      >
        {target && <PositionReplay key={JSON.stringify(target)} target={target} />}
      </DialogContent>
    </Dialog>
  );
}
