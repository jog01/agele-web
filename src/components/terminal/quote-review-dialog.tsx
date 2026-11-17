"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import type { Token } from "@/lib/api/client";
import { DASH, formatAmount, formatPrice, formatUsd, shortAddress } from "@/lib/format";
import { type Side, SLIPPAGE_PCT } from "./order-ticket";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: Side;
  token: Token;
  amount: number;
  price: number;
  receive: number;
  minReceive: number;
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right">{value}</span>
    </div>
  );
}

/**
 * Explicit review step before wallet signing. The production flow is:
 * POST /v1/swaps/quote → review → Privy signs → POST /v1/swaps/:id/submit → confirmation.
 */
export function QuoteReviewDialog({
  open,
  onOpenChange,
  side,
  token,
  amount,
  price,
  receive,
  minReceive,
}: Props) {
  const { demoMode: DEMO_MODE, tradingDisabled } = useMarketDataMode();
  const from = side === "buy" ? { symbol: "USDC", mint: USDC_MINT } : token;
  const to = side === "buy" ? token : { symbol: "USDC", mint: USDC_MINT };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            Review {side} {token.symbol}
          </DialogTitle>
          <DialogDescription>
            Check every detail. Nothing is signed until you confirm in your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="text-[13px]">
          <Line
            label="From"
            value={
              <>
                {formatAmount(amount)} {from.symbol}
                <span className="block font-mono text-muted-foreground text-xs">
                  {shortAddress(from.mint)}
                </span>
              </>
            }
          />
          <Line
            label="To (estimated)"
            value={
              <>
                {formatAmount(receive)} {to.symbol}
                <span className="block font-mono text-muted-foreground text-xs">{shortAddress(to.mint)}</span>
              </>
            }
          />
          <Line label="Minimum receive" value={`${formatAmount(minReceive)} ${to.symbol}`} />
          <Separator className="my-2" />
          <Line label="Price" value={`${formatPrice(price)} / ${token.symbol}`} />
          <Line label="Slippage" value={`${SLIPPAGE_PCT}%`} />
          <Line label="Price impact" value={DASH} />
          <Line label="Platform fee" value={DASH} />
          <Line label="Network fee" value={DASH} />
          <Line label="Network" value="Solana" />
          <Line label="Value" value={formatUsd(side === "buy" ? amount : receive)} />
        </div>
        {DEMO_MODE && (
          <div role="alert" className="flex gap-2 rounded-md bg-warning-subtle p-3 text-warning text-xs">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Demo data: this is an estimate from fixture prices, not a live quote. Submission is disabled.
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button disabled={tradingDisabled}>
            Confirm {side} {token.symbol}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
