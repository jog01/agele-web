"use client";

import { Wallet } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/hooks/use-portfolio";
import type { Portfolio } from "@/lib/api/client";
import { formatUsd } from "@/lib/format";
import { openDeposit } from "@/stores/wallet";

const METRICS = [
  { field: "equityUsd", label: "Total equity", caption: "Cash + marked holdings" },
  { field: "usdcBalance", label: "Available USDC", caption: "Ready to trade" },
  { field: "unrealizedPnlUsd", label: "Unrealized PnL", caption: "Open supported positions" },
  { field: "realizedPnlUsd", label: "Realized PnL", caption: "All time · net of known fees" },
] as const;

const PAGE = "mx-auto w-full max-w-[1280px] space-y-4 px-4 py-4 sm:px-6 sm:py-5";

function PortfolioMetrics({ data, loading = false }: { data?: Portfolio; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {METRICS.map((metric) => (
        <div key={metric.label} className="min-w-0 rounded-md border bg-card p-3 sm:p-4">
          <div className="text-muted-foreground text-xs">{metric.label}</div>
          {loading ? (
            <Skeleton className="my-2 h-8 w-24 motion-reduce:animate-none" />
          ) : (
            <div className="tabular my-2 font-semibold text-2xl leading-8">
              {formatUsd(data?.[metric.field])}
            </div>
          )}
          <div className="min-h-8 text-[11px] text-muted-foreground leading-4">{metric.caption}</div>
        </div>
      ))}
    </div>
  );
}

export function PortfolioLoading() {
  return (
    <div role="status" aria-label="Loading portfolio" className={PAGE}>
      <span className="sr-only">Loading portfolio</span>
      <div aria-hidden className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-semibold text-xl">Portfolio</h1>
            <p className="mt-1 text-muted-foreground text-sm">Your capital. One clear view.</p>
          </div>
          <Skeleton className="h-8 w-40 motion-reduce:animate-none" />
        </div>
        <PortfolioMetrics loading />
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border bg-card px-4 py-10">
          <Skeleton className="size-11 rounded-xl motion-reduce:animate-none" />
          <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
          <Skeleton className="h-3 w-3/4 max-w-sm motion-reduce:animate-none" />
          <Skeleton className="h-3 w-1/2 max-w-xs motion-reduce:animate-none" />
          <Skeleton className="mt-1 h-8 w-28 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioView() {
  const auth = useAuth();
  const portfolio = usePortfolio();
  if (!auth.ready || (auth.authenticated && portfolio.isPending)) return <PortfolioLoading />;
  const data = auth.authenticated && !portfolio.isError ? portfolio.data : undefined;
  const hasHoldings = !!data && (data.equityUsd !== 0 || data.positions.length > 0);
  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl">Portfolio</h1>
          <p className="mt-1 text-muted-foreground text-sm">Your capital. One clear view.</p>
          {auth.authenticated && portfolio.isFetching && (
            <p role="status" className="mt-1 text-muted-foreground text-xs">
              Updating portfolio…
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled>
            Withdraw
          </Button>
          <Button size="sm" disabled={!auth.wallet.address} onClick={openDeposit}>
            Deposit
          </Button>
        </div>
      </div>
      {!auth.configured && !auth.authenticated && (
        <p className="rounded-md border bg-card px-3 py-2 text-muted-foreground text-xs leading-5">
          Sign-in is disabled in this demo build. Holdings, balances and PnL appear once Privy and the indexer
          are connected.
        </p>
      )}
      <PortfolioMetrics data={data} />
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border bg-card px-4 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Wallet className="size-5 text-primary" aria-hidden />
        </span>
        <h2 className="font-semibold text-[15px]">
          {auth.authenticated
            ? portfolio.isError
              ? "Portfolio unavailable"
              : hasHoldings
                ? "Your portfolio"
                : "Your portfolio starts here"
            : "Your portfolio starts here"}
        </h2>
        {(auth.configured || auth.authenticated) && (
          <p
            role={auth.authenticated && portfolio.isError ? "alert" : undefined}
            className="max-w-md text-muted-foreground text-sm leading-6"
          >
            {auth.authenticated
              ? portfolio.isError
                ? "Balances and PnL could not be loaded. Please try again later."
                : hasHoldings
                  ? `${data.positions.length} supported positions. Balances and PnL reflect the latest portfolio snapshot.`
                  : "Deposit USDC to your Solana wallet to start trading. Holdings and PnL appear after your first trade."
              : "Sign in to create your embedded Solana wallet, then deposit USDC to start trading."}
          </p>
        )}
        {auth.authenticated && portfolio.isError && (
          <Button variant="outline" size="sm" onClick={() => portfolio.refetch()}>
            Retry
          </Button>
        )}
        {auth.configured && !auth.authenticated && <Button onClick={auth.login}>Sign in</Button>}
        {auth.wallet.address && <Button onClick={openDeposit}>Deposit USDC</Button>}
      </div>
    </div>
  );
}
