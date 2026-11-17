"use client";

import { LockKeyhole, Settings2, Wallet } from "lucide-react";
import { useId, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { ChangeText } from "@/components/common/change-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { useSwap } from "@/hooks/use-swap";
import type { Token } from "@/lib/api/client";
import { DASH, formatAmount, formatCompactUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuoteReviewDialog } from "./quote-review-dialog";

export type Side = "buy" | "sell";

const BUY_PRESETS = [10, 100, 500, 1000];
const SELL_PRESETS = [25, 50, 75, 100];
export const SLIPPAGE_PCT = 0.5;

/** Client-side estimate for display only; the server quote (Jupiter order) is authoritative. */
export function estimate(side: Side, amount: number, price: number) {
  if (!Number.isFinite(amount) || !Number.isFinite(price) || !(amount > 0) || !(price > 0)) return null;
  const receive = side === "buy" ? amount / price : amount * price;
  if (!Number.isFinite(receive)) return null;
  return { receive, minReceive: receive * (1 - SLIPPAGE_PCT / 100) };
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular", tone)}>{value}</span>
    </div>
  );
}

export function OrderTicket({
  token,
  price,
  initialSide = "buy",
}: {
  token: Token | undefined;
  price: number | null;
  initialSide?: Side;
}) {
  const auth = useAuth();
  const amountId = useId();
  const [side, setSide] = useState<Side>(initialSide);
  const { demoMode: DEMO_MODE } = useMarketDataMode();
  const [raw, setRaw] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const symbol = token?.symbol ?? "";
  const amount = Number(raw);
  const unit = side === "buy" ? "USDC" : symbol;
  const swap = useSwap(token, side, raw, price);
  const est = swap.validAmount && price ? estimate(side, amount, price) : null;

  return (
    <section aria-label="Order ticket" className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex h-8 items-center justify-between">
        <h2 className="font-semibold">
          Trade <span className="text-muted-foreground">{symbol}</span>
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10" aria-label="Trade settings">
              <Settings2 className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trade settings</DialogTitle>
              <DialogDescription>
                Settings are read-only in this preview. The server quote is authoritative.
              </DialogDescription>
            </DialogHeader>
            <Row label="Slippage tolerance" value={`${SLIPPAGE_PCT}%`} />
            <p className="text-muted-foreground text-xs">
              Every quote must be reviewed before wallet signing. No transaction can be submitted in demo
              mode.
            </p>
          </DialogContent>
        </Dialog>
      </div>
      <ToggleGroup
        type="single"
        value={side}
        onValueChange={(v) => {
          if (!v) return;
          setSide(v as Side);
          setRaw("");
        }}
        className="grid w-full grid-cols-2"
        aria-label="Order side"
      >
        <ToggleGroupItem
          value="buy"
          className="h-10 data-[state=on]:bg-positive-subtle data-[state=on]:text-positive"
        >
          Buy
        </ToggleGroupItem>
        <ToggleGroupItem
          value="sell"
          className="h-10 data-[state=on]:bg-negative-subtle data-[state=on]:text-negative"
        >
          Sell
        </ToggleGroupItem>
      </ToggleGroup>

      <label
        className="mt-4 mb-1.5 flex items-center justify-between text-muted-foreground text-xs"
        htmlFor={amountId}
      >
        {side === "buy" ? "You pay" : "You sell"}
        <span className="font-medium text-foreground">{unit}</span>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (swap.pending) {
            void swap.confirm();
            return;
          }
          if (
            swap.validAmount &&
            (est || swap.quote) &&
            token &&
            !swap.busy &&
            (auth.authenticated || DEMO_MODE)
          )
            setReviewOpen(true);
        }}
      >
        <div className="relative rounded-md border border-input/70 bg-background px-3 py-3 focus-within:ring-2 focus-within:ring-foreground/50">
          {side === "buy" && (
            <span
              className="pointer-events-none absolute top-3.5 left-3 text-2xl text-muted-foreground"
              aria-hidden
            >
              $
            </span>
          )}
          <input
            id={amountId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-invalid={!!swap.validation}
            aria-describedby={`${amountId}-balance ${amountId}-validation`}
            className={cn(
              "tabular w-full bg-transparent font-medium text-[32px] leading-10 outline-none placeholder:text-muted-foreground/50",
              side === "buy" && "pl-5",
            )}
          />
          <div
            id={`${amountId}-balance`}
            className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs"
          >
            <Wallet className="size-3" aria-hidden />
            Balance {DASH}
            <span className="ml-auto">{auth.authenticated ? "Not available" : "Sign in to view"}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {(side === "buy" ? BUY_PRESETS : SELL_PRESETS).map((p) => (
            <Button
              key={p}
              type="button"
              variant="secondary"
              size="sm"
              disabled={side === "sell"}
              onClick={() => setRaw(String(p))}
              className={cn(
                "tabular h-10 px-1 text-xs",
                side === "buy" && Number(raw) === p && "bg-accent text-accent-foreground",
              )}
            >
              {side === "buy" ? `$${p}` : `${p}%`}
            </Button>
          ))}
        </div>

        <p id={`${amountId}-validation`} className="mt-1 text-warning text-xs">
          {swap.validation}
        </p>
        <Separator className="my-3" />
        <div className="text-[13px]">
          <Row
            label="Estimated receive"
            value={
              swap.receive
                ? `${swap.receive} ${side === "buy" ? symbol : "USDC"}`
                : swap.fallback && est
                  ? `${formatAmount(est.receive)} ${side === "buy" ? symbol : "USDC"}`
                  : DASH
            }
          />
          <Row
            label="Minimum receive"
            value={
              swap.minReceive
                ? `${swap.minReceive} ${side === "buy" ? symbol : "USDC"}`
                : swap.fallback && est
                  ? `${formatAmount(est.minReceive)} ${side === "buy" ? symbol : "USDC"}`
                  : DASH
            }
          />
          <Row label="Slippage" value={`${(swap.quote?.slippageBps ?? 50) / 100}%`} />
          <Row label="Price impact" value={swap.quote ? `${swap.quote.priceImpactPct}%` : DASH} />
          <Row label="Platform fee" value={swap.quote ? `${swap.quote.feeBps / 100}%` : DASH} />
          <Row label="Network fee" value="Not quoted" />
        </div>

        <Button
          type="submit"
          className={cn(
            "mt-3 h-11 w-full font-semibold",
            side === "buy"
              ? "bg-positive text-positive-foreground hover:bg-positive/90"
              : "bg-negative text-negative-foreground hover:bg-negative/90",
          )}
          disabled={
            swap.busy ||
            (!swap.pending &&
              (auth.authenticated
                ? !swap.validAmount || (!est && !swap.quote) || !token
                : !auth.configured || !auth.ready))
          }
          onClick={(e) => {
            if (!auth.authenticated) {
              e.preventDefault();
              auth.login();
            }
          }}
        >
          {swap.pending
            ? "Check swap status"
            : auth.authenticated
              ? `Review ${side} ${symbol}`
              : "Sign in to trade"}
        </Button>
        {DEMO_MODE && (
          <>
            <Button
              type="submit"
              variant="ghost"
              className="mt-1 h-10 w-full text-xs"
              disabled={!swap.validAmount || (!est && !swap.quote) || !token || swap.busy}
            >
              Preview {side} {symbol}
            </Button>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-warning text-xs">
              <LockKeyhole className="size-3" aria-hidden />
              Demo market data
            </p>
          </>
        )}
      </form>
      {swap.status && swap.status !== swap.validation && (
        <p role="status" className="mt-2 text-center text-warning text-xs">
          {swap.status}
          {swap.explorerUrl && (
            <>
              {" "}
              <a href={swap.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
                View on Solscan
              </a>
            </>
          )}
        </p>
      )}

      {token && swap.validAmount && (est || swap.quote) && (
        <QuoteReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          side={side}
          token={token}
          amount={swap.inputAmount ?? DASH}
          price={price ?? 0}
          receive={swap.receive ?? (swap.fallback && est ? formatAmount(est.receive) : DASH)}
          minReceive={swap.minReceive ?? (swap.fallback && est ? formatAmount(est.minReceive) : DASH)}
          swap={swap}
        />
      )}
    </section>
  );
}

export function PositionCard({ symbol }: { symbol: string }) {
  const auth = useAuth();
  return (
    <section aria-label="Your positions" className="rounded-lg border bg-card p-3">
      <h2 className="mb-2 font-semibold">Your positions</h2>
      <Tabs defaultValue="open">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
        {["open", "closed"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="flex min-h-20 flex-col items-center justify-center gap-1 px-2 py-3 text-center text-xs">
              <Wallet className="mb-1 size-4 text-muted-foreground" aria-hidden />
              <span className="font-medium">
                {auth.authenticated ? "Position data unavailable" : "Sign in to see your positions"}
              </span>
              <span className="text-muted-foreground">{symbol} quantity, cost and PnL appear here.</span>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

export function MarketContext({ token }: { token: Token | undefined }) {
  return (
    <section aria-label="About this market" className="rounded-lg border bg-card p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-[13px]">About {token?.symbol ?? "this market"}</h2>
        <span className="text-muted-foreground">Solana spot</span>
      </div>
      <p className="leading-relaxed text-muted-foreground">
        {token?.name ?? "Token"} market overview. Descriptions and social links are not provided by this data
        source.
      </p>
      <div className="mt-3 grid grid-cols-4 divide-x rounded-md border py-2 text-center">
        {["5m", "1h", "4h", "24h"].map((range) => (
          <div key={range}>
            <div className="mb-1 text-muted-foreground">{range}</div>
            {range === "24h" ? (
              <ChangeText value={token?.priceChange24hPct} />
            ) : (
              <span title="Intraday change unavailable">{DASH}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Row label="Pool liquidity" value={formatCompactUsd(token?.liquidityUsd)} />
        <Row label="Top 10 holders" value="Unavailable" />
        <Row label="Order-book depth" value="Unavailable" />
      </div>
      <p className="mt-1 text-muted-foreground leading-relaxed">
        AMM liquidity is not an order book. No depth ladder is available.
      </p>
      <div className="mt-3 space-y-3 border-t pt-3">
        {["Buys / sells", "Buyers / sellers"].map((label) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular">
                {DASH} / {DASH}
              </span>
            </div>
            <div className="h-1 rounded-full bg-secondary" aria-hidden />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Intraday changes, concentration and flow ratios are unavailable. Prices can move before confirmation.
      </p>
    </section>
  );
}
