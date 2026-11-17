"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/wallet/account-menu";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { PRODUCT_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export type NavSection = "trade" | "feed" | "leaderboard" | "portfolio";

export const NAV = [
  { href: "/trade", label: "Trade", section: "trade" },
  { href: "/feed", label: "Feed", section: "feed" },
  { href: "/leaderboard", label: "Leaderboard", section: "leaderboard" },
  { href: "/portfolio", label: "Portfolio", section: "portfolio" },
] as const;

export function TopBar({ section, onSearch }: { section?: NavSection; onSearch?: () => void }) {
  const { demoMode: DEMO_MODE } = useMarketDataMode();
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-sidebar px-3">
      <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
        <span className="inline-block size-5 rounded-md bg-primary" aria-hidden />
        {PRODUCT_NAME}
      </Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.section === section;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
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
        className="mx-auto hidden h-8 w-full max-w-sm items-center gap-2 rounded-md border border-input/60 bg-card px-3 text-muted-foreground transition-colors hover:border-input md:flex"
      >
        <Search className="size-4" aria-hidden />
        <span>Search markets</span>
        <kbd className="ml-auto rounded border px-1.5 font-mono text-[11px]">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onSearch}
          aria-label="Search markets"
        >
          <Search className="size-4" />
        </Button>
        {DEMO_MODE && <DemoBadge />}
        <AccountMenu />
      </div>
    </header>
  );
}
