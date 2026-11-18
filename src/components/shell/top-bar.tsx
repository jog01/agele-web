"use client";

import { Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { Brand } from "@/components/common/brand";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/wallet/account-menu";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
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
    <header className="flex h-[72px] shrink-0 items-center gap-5 border-b border-border/60 bg-sidebar px-4 lg:px-6">
      <Link
        href="/"
        aria-label="Agele home"
        className="flex min-h-11 shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-foreground"
      >
        <Brand />
      </Link>
      <nav className="hidden h-full items-center gap-5 lg:flex" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.section === section;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-full items-center border-b-2 border-transparent px-1 font-medium text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground",
                active && "border-primary text-primary",
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
        className="mx-auto hidden h-11 min-w-0 flex-1 max-w-xs items-center gap-3 rounded-lg border border-border/60 bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:border-input focus-visible:outline-2 focus-visible:outline-foreground md:flex"
      >
        <Search className="size-4" aria-hidden />
        <span className="truncate">Search Agele</span>
        <kbd className="ml-auto hidden shrink-0 rounded border px-1 font-mono text-xs xl:block">/</kbd>
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
