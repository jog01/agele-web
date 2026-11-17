"use client";

import { Wallet } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatUsd } from "@/lib/format";
import { openDeposit } from "@/stores/wallet";

const METRICS = [
  { field: "equityUsd", label: "Total equity", caption: "Cash + marked holdings" },
  { field: "usdcBalance", label: "Available USDC", caption: "Ready to trade" },
  { field: "unrealizedPnlUsd", label: "Unrealized PnL", caption: "Open supported positions" },
  { field: "realizedPnlUsd", label: "Realized PnL", caption: "All time · net of known fees" },
] as const;

export function PortfolioView() {
  const auth = useAuth();
  const portfolio = usePortfolio();
  const data = auth.authenticated && !portfolio.isError ? portfolio.data : undefined;
  const hasHoldings = !!data && (data.equityUsd !== 0 || data.positions.length > 0);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-6 py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Portfolio</h1>
          <p className="mt-1 text-muted-foreground">Your capital. One clear view.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled>
            Withdraw
          </Button>
          <Button disabled={!auth.wallet.address} onClick={openDeposit}>
            Deposit
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground">{m.label}</div>
            <div className="tabular mt-2 font-semibold text-[32px] leading-10">
              {formatUsd(data?.[m.field])}
            </div>
            <div className="mt-2 text-muted-foreground text-xs">{m.caption}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-16 text-center">
        <Wallet className="size-8 text-primary" aria-hidden />
        <h2 className="font-semibold text-[15px]">
          {auth.authenticated
            ? portfolio.isError
              ? "Portfolio unavailable"
              : portfolio.isPending
                ? "Loading portfolio…"
                : hasHoldings
                  ? "Your portfolio"
                  : "Your portfolio starts here"
            : "Your portfolio starts here"}
        </h2>
        <p className="max-w-md text-muted-foreground">
          {auth.authenticated
            ? portfolio.isError
              ? "Balances and PnL could not be loaded. Please try again later."
              : portfolio.isPending
                ? "Fetching your balances and supported positions."
                : hasHoldings
                  ? `${data.positions.length} supported positions. Balances and PnL reflect the latest portfolio snapshot.`
                  : "Deposit USDC to your Solana wallet to start trading. Holdings and PnL appear after your first trade."
            : auth.configured
              ? "Sign in to create your embedded Solana wallet, then deposit USDC to start trading."
              : "Sign-in is disabled in this demo build. Holdings, balances and PnL appear once Privy and the indexer are connected."}
        </p>
        {auth.configured && !auth.authenticated && <Button onClick={auth.login}>Sign in</Button>}
        {auth.wallet.address && <Button onClick={openDeposit}>Deposit USDC</Button>}
      </div>
    </div>
  );
}
