"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Token } from "@/lib/api/client";
import { DEMO_MODE } from "@/lib/config";
import { DASH, formatAmount, formatCompactUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuoteReviewDialog } from "./quote-review-dialog";

export type Side = "buy" | "sell";

const BUY_PRESETS = [25, 50, 100, 250];
const SELL_PRESETS = [25, 50, 75, 100];
export const SLIPPAGE_PCT = 0.5;

/** Client-side estimate for display only; the server quote (Jupiter order) is authoritative. */
export function estimate(side: Side, amount: number, price: number) {
  if (!(amount > 0) || !(price > 0)) return null;
  const receive = side === "buy" ? amount / price : amount * price;
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
  const [side, setSide] = useState<Side>(initialSide);
  const [raw, setRaw] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const symbol = token?.symbol ?? "";
  const amount = Number(raw);
  const est = price ? estimate(side, amount, price) : null;
  const unit = side === "buy" ? "USDC" : symbol;

  return (
    <section aria-label="Order ticket" className="rounded-lg border bg-card p-3">
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
          className="data-[state=on]:bg-positive-subtle data-[state=on]:text-positive"
        >
          Buy
        </ToggleGroupItem>
        <ToggleGroupItem
          value="sell"
          className="data-[state=on]:bg-negative-subtle data-[state=on]:text-negative"
        >
          Sell
        </ToggleGroupItem>
      </ToggleGroup>

      <label
        className="mt-4 mb-1.5 flex items-center justify-between text-muted-foreground text-xs"
        htmlFor="order-amount"
      >
        {side === "buy" ? "You pay" : "You sell"}
        <span className="font-medium text-foreground">{unit}</span>
      </label>
      <div className="rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <input
          id="order-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={raw}
          onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setRaw(e.target.value)}
          className="tabular w-full bg-transparent font-semibold text-[28px] leading-9 outline-none placeholder:text-muted-foreground/50"
        />
        <div className="text-muted-foreground text-xs">Available {DASH} · sign in to see balance</div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {(side === "buy" ? BUY_PRESETS : SELL_PRESETS).map((p) => (
          <Button
            key={p}
            variant="secondary"
            size="sm"
            disabled={side === "sell"}
            onClick={() => setRaw(String(p))}
            className={cn(
              "tabular",
              side === "buy" && Number(raw) === p && "bg-accent text-accent-foreground",
            )}
          >
            {side === "buy" ? `$${p}` : `${p}%`}
          </Button>
        ))}
      </div>

      <Separator className="my-3" />
      <div className="text-[13px]">
        <Row
          label="Estimated receive"
          value={est ? `${formatAmount(est.receive)} ${side === "buy" ? symbol : "USDC"}` : DASH}
        />
        <Row
          label="Minimum receive"
          value={est ? `${formatAmount(est.minReceive)} ${side === "buy" ? symbol : "USDC"}` : DASH}
        />
        <Row label="Slippage" value={`${SLIPPAGE_PCT}%`} />
        <Row label="Price impact" value={DASH} />
        <Row label="Platform fee" value={DASH} />
        <Row label="Network fee" value="Quoted on review" />
      </div>

      <Button
        className={cn(
          "mt-3 h-10 w-full font-semibold",
          side === "buy"
            ? "bg-positive text-positive-foreground hover:bg-positive/90"
            : "bg-negative text-negative-foreground hover:bg-negative/90",
        )}
        disabled={!est || !token}
        onClick={() => setReviewOpen(true)}
      >
        Review {side} {symbol}
      </Button>
      {DEMO_MODE && <p className="mt-2 text-center text-warning text-xs">Demo only · submission disabled</p>}

      {token && est && price && (
        <QuoteReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          side={side}
          token={token}
          amount={amount}
          price={price}
          receive={est.receive}
          minReceive={est.minReceive}
        />
      )}
    </section>
  );
}

export function PositionCard({ symbol }: { symbol: string }) {
  return (
    <section aria-label="Your position" className="rounded-lg border bg-card p-3">
      <h2 className="font-semibold text-[15px]">Your position</h2>
      <p className="mt-2 text-muted-foreground">
        Sign in to see your {symbol} quantity, average cost and unrealized PnL.
      </p>
    </section>
  );
}

export function MarketContext({ token }: { token: Token | undefined }) {
  return (
    <section aria-label="Market context" className="rounded-lg border bg-card p-3">
      <h2 className="mb-1 font-semibold text-[15px]">Market context</h2>
      <Row label="Liquidity" value={formatCompactUsd(token?.liquidityUsd)} />
      <Row label="Network" value="Solana" />
      <p className="mt-2 text-muted-foreground text-xs">
        Prices can move before confirmation. Review every transaction.
      </p>
    </section>
  );
}
