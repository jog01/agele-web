"use client";

import { Activity, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/wallet/account-menu";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { PRODUCT_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { openDeposit } from "@/stores/wallet";

export type NavSection = "trade" | "feed" | "leaderboard" | "portfolio";

export const NAV = [
  { href: "/trade", label: "Trade", section: "trade" },
  { href: "/feed", label: "Feed", section: "feed" },
  { href: "/leaderboard", label: "Leaderboard", section: "leaderboard" },
  { href: "/portfolio", label: "Portfolio", section: "portfolio" },
] as const;

export function TopBar({ section, onSearch }: { section?: NavSection; onSearch?: () => void }) {
  const auth = useAuth();
  const balance = useUsdcBalance(auth.authenticated ? auth.wallet.address : null);
  const { demoMode: DEMO_MODE } = useMarketDataMode();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-sidebar px-3">
      <Link
        href="/"
        className="flex min-h-11 shrink-0 items-center gap-2 font-semibold text-[15px] tracking-tight"
      >
        <span
          className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Activity className="size-4" />
        </span>
        {PRODUCT_NAME}
      </Link>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.section === section;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground",
                active && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={onSearch}
        className="mx-auto hidden h-10 min-w-0 flex-1 max-w-sm items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-xs text-muted-foreground transition-colors hover:border-input focus-visible:outline-2 focus-visible:outline-foreground md:flex"
      >
        <Search className="size-4" aria-hidden />
        <span className="truncate">Search tokens or traders</span>
        <kbd className="ml-auto hidden shrink-0 rounded border px-1 font-mono text-[10px] xl:block">
          Ctrl / ⌘ K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          onClick={onSearch}
          aria-label="Search tokens or traders"
        >
          <Search className="size-4" />
        </Button>
        {DEMO_MODE && <DemoBadge />}
        <div className="hidden items-center gap-2 border-l pl-3 xl:flex">
          <span
            className="tabular flex items-center gap-1.5 text-muted-foreground text-xs"
            title={balance.data === undefined ? "Cash balance unavailable" : "USDC balance"}
          >
            <Wallet className="size-3.5" aria-hidden />
            {balance.data === undefined ? "USDC —" : `${formatUsd(balance.data)} USDC`}
          </span>
          <Button
            variant="secondary"
            className="h-10"
            disabled={!auth.authenticated || !auth.wallet.address}
            onClick={openDeposit}
            title={auth.authenticated ? "Deposit USDC on Solana" : "Sign in to deposit"}
          >
            Deposit
          </Button>
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}
