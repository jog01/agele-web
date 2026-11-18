"use client";

import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTokenHolders, useTokenPosition, useTokenTraders } from "@/hooks/use-token-activity";
import { ApiError } from "@/lib/api/client";
import {
  changeTone,
  formatAmount,
  formatCompact,
  formatPct,
  formatPrice,
  formatUsd,
  shortAddress,
  utcTimestamp,
} from "@/lib/format";

export function HoldersPanel({ mint }: { mint: string }) {
  const query = useTokenHolders(mint);
  if (query.isPending) return <p className="p-4 text-muted-foreground">Loading holders…</p>;
  if (query.isError)
    return (
      <div className="space-y-2 p-4">
        <p>
          {query.error instanceof ApiError && query.error.status === 404
            ? "Token not found."
            : "Holder data temporarily unavailable."}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const data = query.data;
  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-4">
        <p>
          Holders <span className="tabular font-medium">{formatCompact(data.totalHolders)}</span>
        </p>
        <p>
          Top 10 holders{" "}
          <span className="tabular font-medium">{formatPct(data.top10Pct, { signed: false })}</span>
        </p>
        <p className="w-full text-muted-foreground text-xs">
          Updated{" "}
          <time dateTime={new Date(data.updatedAt * 1000).toISOString()}>{utcTimestamp(data.updatedAt)}</time>{" "}
          · largest owner wallets
        </p>
      </div>
      {!data.holders.length ? (
        <p className="px-3">No holder data for this token yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Supply %</TableHead>
              <TableHead className="text-right">Value (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.holders.map((holder) => (
              <TableRow key={holder.wallet} className="h-12 border-border/50">
                <TableCell className="tabular">{holder.rank}</TableCell>
                <TableCell>
                  <a
                    className="font-mono text-xs hover:underline"
                    href={`https://solscan.io/account/${holder.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortAddress(holder.wallet)}
                  </a>
                  {holder.isPool && (
                    <span className="ml-2 rounded border px-1.5 py-0.5 text-muted-foreground text-xs">
                      Pool · {holder.label ?? "Unknown pool"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tabular text-right">{formatAmount(holder.amount)}</TableCell>
                <TableCell className="tabular text-right">
                  {formatPct(holder.pctSupply, { signed: false })}
                </TableCell>
                <TableCell className="tabular text-right">{formatUsd(holder.valueUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function Pnl({ value }: { value: number }) {
  return (
    <span className={changeTone(value)}>
      {value > 0 ? "+" : ""}
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
  if (!auth.ready) return <p className="p-4 text-muted-foreground">Loading sign-in…</p>;
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
  if (query.isPending) return <p className="p-4 text-muted-foreground">Loading position…</p>;
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
          <p className="font-medium">
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
  if (query.isPending) return <p className="p-4 text-muted-foreground">Loading traders…</p>;
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
