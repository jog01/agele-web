"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { tokenQueries } from "@/lib/api/queries";
import { formatPrice, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Fetch on open only: the dialog hydrates before the terminal boundary, and an early cache fill would mismatch it.
  const { data: tokens = [] } = useQuery({ ...tokenQueries.trending(), enabled: open });
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? tokens.filter(
          (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.mint === query,
        )
      : tokens;
  }, [tokens, query]);

  const select = (mint: string) => {
    onOpenChange(false);
    router.push(`/trade/${mint}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault();
          else {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search tokens</DialogTitle>
          <DialogDescription>
            Search supported Solana tokens by symbol, name or mint address.
          </DialogDescription>
        </DialogHeader>
        <form
          className="relative border-b px-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[active]) select(results[active].mint);
          }}
        >
          <Search
            className="pointer-events-none absolute top-4 left-4 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={inputRef}
            type="search"
            aria-label="Search tokens by symbol, name or mint address"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.max(0, Math.min(i + 1, results.length - 1)));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
            }}
            placeholder="Symbol, name or mint address"
            className="h-12 rounded-none border-0 bg-transparent pr-10 pl-8 text-base shadow-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 dark:bg-transparent"
          />
        </form>
        <ul className="max-h-80 overflow-auto p-1">
          {results.length === 0 && (
            <li className="p-6 text-center text-muted-foreground">No supported markets match.</li>
          )}
          {results.map((t, i) => (
            <li key={t.mint}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => select(t.mint)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
                  i === active && "bg-surface-hover",
                )}
              >
                <AssetAvatar mint={t.mint} symbol={t.symbol} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.symbol}</span>
                  <span className="block truncate text-muted-foreground text-xs">
                    {t.name} · Solana · <span className="font-mono">{shortAddress(t.mint)}</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block">{formatPrice(t.priceUsd)}</span>
                  <ChangeText value={t.priceChange24hPct} className="text-xs" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>Looking for a trader?</span>
          <Link
            href="/leaderboard"
            onClick={() => onOpenChange(false)}
            className="text-primary hover:underline"
          >
            Explore the leaderboard →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
