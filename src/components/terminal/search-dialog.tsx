"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search markets</DialogTitle>
          <DialogDescription>
            Search supported Solana tokens by symbol, name or mint address.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1));
              if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
              if (e.key === "Enter" && results[active]) select(results[active].mint);
            }}
            placeholder="Symbol, name or mint address"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
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
                <AssetAvatar symbol={t.symbol} />
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
      </DialogContent>
    </Dialog>
  );
}
