"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
import { useMintSearch } from "@/hooks/use-mint-search";
import { useSearch } from "@/hooks/use-search";
import type { Token } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import type { SearchTrader } from "@/lib/api/search";
import { formatCompactUsd, formatPrice, shortAddress } from "@/lib/format";
import { getSearchMint } from "@/lib/token-search";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Tokens", "Traders"] as const;
const RECENTS_KEY = "agele:search:recent-mints";
const RECENTS_LIMIT = 4;
const TOKEN_GRID =
  "grid grid-cols-[minmax(0,1fr)_3.25rem_4.75rem_3.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_5.5rem_3.5rem] sm:gap-4";

type Result = { kind: "token"; token: Token } | { kind: "trader"; trader: SearchTrader };

function tokenResult(token: Token): Result {
  return { kind: "token", token };
}

function resultKey(result: Result) {
  return result.kind === "token" ? `token-${result.token.mint}` : `trader-${result.trader.wallet}`;
}

function readRecents(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    if (Array.isArray(stored)) {
      return [
        ...new Set(
          stored.filter((mint): mint is string => typeof mint === "string" && getSearchMint(mint) === mint),
        ),
      ].slice(0, RECENTS_LIMIT);
    }
  } catch {}
  return [];
}

function TokenSummary({ token }: { token: Token }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2 sm:gap-3">
        <AssetAvatar imageUrl={token.imageUrl} />
        <span className="min-w-0">
          <span className="flex items-baseline gap-1">
            <span className="truncate font-medium">{token.symbol}</span>
            <span className="text-muted-foreground text-xs sm:hidden">Solana</span>
          </span>
          <span className="block truncate text-muted-foreground text-xs">{token.name}</span>
          <span className="block truncate text-muted-foreground text-xs" title={token.mint}>
            <span className="hidden sm:inline">Solana · </span>
            <span className="font-mono">{shortAddress(token.mint)}</span>
          </span>
        </span>
      </span>
      <span className="text-right text-xs tabular-nums">{formatCompactUsd(token.marketCapUsd)}</span>
      <span className="text-right text-xs tabular-nums">{formatPrice(token.priceUsd)}</span>
      <ChangeText
        value={token.priceChange24hPct}
        className="justify-end text-xs tabular-nums max-sm:[&_svg]:hidden"
      />
    </>
  );
}

function TraderSummary({ trader }: { trader: SearchTrader }) {
  const { avatarUrl, displayName, handle, wallet } = trader;
  return (
    <>
      <span aria-hidden>
        {avatarUrl ? (
          <TraderAvatar avatarUrl={avatarUrl} displayName={displayName} handle={handle} className="size-9" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground">
            <UserRound className="size-4" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{displayName || handle}</span>
        <span className="block truncate text-muted-foreground text-xs">
          @{handle} ·{" "}
          <span className="font-mono" title={wallet}>
            {shortAddress(wallet)}
          </span>
        </span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-2 py-1">
      <span className="sr-only">{label}</span>
      {[0, 1].map((row) => (
        <div key={row} className="flex h-12 items-center gap-3 px-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-24" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const scrollSelection = useRef(false);
  const focusReturn = useDialogFocusReturn();
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [activeKey, setActiveKey] = useState<string>();
  const [recentMints, setRecentMints] = useState<string[]>([]);
  const [pasteDenied, setPasteDenied] = useState(false);
  const q = query.trim();
  const mint = getSearchMint(q);
  const discovery = useQuery({ ...tokenQueries.trending(), enabled: open && (!q || !!mint) });
  const trending = discovery.data ?? [];
  const lookup = useMintSearch(mint, trending, open);
  const search = useSearch(q, open);
  const recentDetails = useQueries({
    queries: (open && !q && filter !== "Traders" ? recentMints : []).map((address) => ({
      ...tokenQueries.detail(address),
      enabled: !trending.some((token) => token.mint === address),
      refetchInterval: false,
      retry: false,
    })),
  });
  const recentTokens =
    !q && filter !== "Traders"
      ? recentMints.flatMap((address, i) => {
          const token = trending.find((item) => item.mint === address) ?? recentDetails[i]?.data;
          return token ? [token] : [];
        })
      : [];
  const exactToken = lookup.token ?? search.data?.tokens.find((token) => token.mint === mint);
  const tokenMatches = mint
    ? exactToken
      ? [exactToken]
      : []
    : q
      ? (search.data?.tokens ?? [])
      : trending.filter((token) => !recentMints.includes(token.mint));
  const tokens = filter === "Traders" ? [] : tokenMatches;
  const traders: Result[] =
    filter === "Tokens" ? [] : (search.data?.traders ?? []).map((trader) => ({ kind: "trader", trader }));
  const visibleResults = [...recentTokens.map(tokenResult), ...tokens.map(tokenResult), ...traders];
  const activeIndex = Math.max(
    0,
    visibleResults.findIndex((result) => resultKey(result) === activeKey),
  );
  const active = visibleResults[activeIndex];
  const activeId = active ? `${resultsId}-${resultKey(active)}` : undefined;
  const isPending = q
    ? (filter !== "Traders" && lookup.isPending && !exactToken) || search.isPending
    : filter !== "Traders" && discovery.isPending;
  const tokensUnavailable = !!search.data?.tokensUnavailable && filter !== "Traders";
  const addressUnavailable =
    !!mint && filter !== "Traders" && !exactToken && lookup.isError && !lookup.isNotFound;
  const isError = q ? search.isError : discovery.isError && !discovery.data;
  const tokenOnlyLookup = !!mint && filter === "Tokens" && !!exactToken;
  const status =
    isError && !tokenOnlyLookup
      ? q
        ? "Search unavailable. Try again."
        : "Trending markets unavailable."
      : addressUnavailable
        ? "Token lookup unavailable."
        : tokensUnavailable
          ? "Some token results may be unavailable."
          : !visibleResults.length
            ? !q
              ? filter === "Traders"
                ? "Enter a trader name, handle or wallet."
                : "No trending markets."
              : mint && filter !== "Traders"
                ? "No token found for this address."
                : "No matches found."
            : null;

  useEffect(() => {
    if (!scrollSelection.current) return;
    scrollSelection.current = false;
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  function updateRecents(mints: string[]) {
    setRecentMints(mints);
    try {
      if (mints.length) localStorage.setItem(RECENTS_KEY, JSON.stringify(mints));
      else localStorage.removeItem(RECENTS_KEY);
    } catch {}
  }

  function changeQuery(value: string) {
    setQuery(value.slice(0, 100));
    setActiveKey(undefined);
    setPasteDenied(false);
  }

  function close() {
    changeQuery("");
    setFilter("All");
    composing.current = false;
    onOpenChange(false);
  }

  function select(result: Result) {
    if (result.kind === "token") {
      const address = result.token.mint;
      updateRecents([address, ...recentMints.filter((item) => item !== address)].slice(0, RECENTS_LIMIT));
      close();
      router.push(`/trade/${encodeURIComponent(address)}`);
    } else {
      close();
      router.push(`/traders/${encodeURIComponent(result.trader.wallet)}`);
    }
  }

  async function pasteAddress() {
    const input = inputRef.current;
    try {
      const text = await navigator.clipboard.readText();
      if (input !== inputRef.current) return;
      if (text.trim()) changeQuery(text.trim());
    } catch {
      if (input !== inputRef.current) return;
      setPasteDenied(true);
    }
    input?.focus();
  }

  function renderResult(result: Result) {
    const key = resultKey(result);
    const selected = key === (active && resultKey(active));
    return (
      <li key={key}>
        <button
          id={`${resultsId}-${key}`}
          type="button"
          aria-current={selected || undefined}
          onClick={() => select(result)}
          className={cn(
            "min-h-11 w-full rounded-md px-2 py-2 text-left outline-offset-[-2px] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground",
            result.kind === "token" ? TOKEN_GRID : "flex items-center gap-3",
            selected && "bg-surface-hover",
          )}
        >
          {result.kind === "token" ? (
            <TokenSummary token={result.token} />
          ) : (
            <TraderSummary trader={result.trader} />
          )}
        </button>
      </li>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent
        className="flex max-h-dvh flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[min(42rem,85dvh)] sm:max-w-2xl [&_[data-slot=dialog-close]]:top-[max(0.25rem,env(safe-area-inset-top))]"
        onCloseAutoFocus={focusReturn.onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (event.isComposing || composing.current) event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          focusReturn.onOpenAutoFocus();
          setRecentMints(readRecents());
          event.preventDefault();
          if (!window.matchMedia("(pointer: coarse)").matches) inputRef.current?.focus();
          else
            inputRef.current
              ?.closest("[role=dialog]")
              ?.querySelector<HTMLElement>("[data-slot=dialog-close]")
              ?.focus();
        }}
      >
        <DialogHeader className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-5">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription className="sr-only">
            Find supported Solana tokens and public trader profiles.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex shrink-0 items-center gap-2 px-4 sm:px-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (active && !composing.current) select(active);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              type="search"
              aria-label="Search tokens or traders"
              aria-controls={resultsId}
              aria-activedescendant={activeId}
              aria-describedby={pasteDenied ? `${resultsId}-paste` : undefined}
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || composing.current || !visibleResults.length) return;
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const next = Math.max(
                    0,
                    Math.min(visibleResults.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1)),
                  );
                  if (next !== activeIndex) {
                    scrollSelection.current = true;
                    setActiveKey(resultKey(visibleResults[next]));
                  }
                }
              }}
              placeholder="Token, trader or address"
              className="h-12 pl-9 text-base"
            />
          </div>
          <Button type="button" variant="outline" className="h-12 px-3 text-xs" onClick={pasteAddress}>
            Paste <span className="sr-only sm:not-sr-only">address</span>
          </Button>
        </form>
        {pasteDenied && (
          <p
            id={`${resultsId}-paste`}
            role="status"
            className="px-4 pt-2 text-muted-foreground text-xs sm:px-5"
          >
            Clipboard unavailable. Paste directly into the search field.
          </p>
        )}
        <fieldset aria-label="Result type" className="mt-2 flex shrink-0 gap-1 border-b px-4 sm:px-5">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => {
                setFilter(item);
                setActiveKey(undefined);
              }}
              className="min-h-11 min-w-16 border-b-2 border-transparent px-2 font-medium text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground aria-pressed:border-primary aria-pressed:text-primary"
            >
              {item}
            </button>
          ))}
        </fieldset>
        <fieldset
          id={resultsId}
          aria-label="Search results"
          className="min-h-0 overflow-y-auto overscroll-contain px-4 py-2 max-sm:flex-1 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:min-h-44 sm:px-5"
        >
          {!!recentTokens.length && (
            <section aria-label="Recent tokens" className="mb-3">
              <div className="flex h-11 items-center justify-between">
                <h2 className="font-medium text-muted-foreground text-xs">Recent tokens</h2>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 text-xs"
                  onClick={() => {
                    updateRecents([]);
                    inputRef.current?.focus();
                  }}
                >
                  Clear all
                </Button>
              </div>
              <ul>{recentTokens.map((token) => renderResult(tokenResult(token)))}</ul>
            </section>
          )}
          {!!tokens.length && (
            <section aria-label={q ? "Tokens" : "Markets"}>
              <div className={cn(TOKEN_GRID, "px-2 py-2 text-muted-foreground text-xs")}>
                <h2 className="font-medium">{q ? "Tokens" : "Markets"}</h2>
                <span className="whitespace-nowrap text-right">Market cap</span>
                <span className="text-right">Price</span>
                <span className="text-right">24h</span>
              </div>
              <ul>{tokens.map((token) => renderResult(tokenResult(token)))}</ul>
            </section>
          )}
          {!!traders.length && (
            <section aria-label="Traders" className={tokens.length ? "mt-2 border-t pt-1" : undefined}>
              <h2 className="px-2 py-2 font-medium text-muted-foreground text-xs">Traders</h2>
              <ul>{traders.map(renderResult)}</ul>
            </section>
          )}
          {isPending && !visibleResults.length && (
            <LoadingRows
              label={
                lookup.isPending && filter !== "Traders"
                  ? "Looking up token…"
                  : q
                    ? "Searching…"
                    : "Loading markets…"
              }
            />
          )}
          {!isPending && status && (
            <p role="status" className="px-2 py-3 text-muted-foreground text-xs">
              {status}
            </p>
          )}
        </fieldset>
        <div className="hidden shrink-0 justify-between border-t px-5 py-3 text-muted-foreground text-xs sm:flex">
          <span>
            <kbd>↑ ↓</kbd> Navigate <span className="mx-2">·</span> <kbd>Enter</kbd> Open{" "}
            <span className="mx-2">·</span> <kbd>Esc</kbd> Close
          </span>
          <span>Solana markets</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
