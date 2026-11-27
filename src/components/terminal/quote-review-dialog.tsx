"use client";

import { TriangleAlert } from "lucide-react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
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
import type { useSwap } from "@/hooks/use-swap";
import type { Token } from "@/lib/api/client";
import { DASH, formatPrice, formatUsd, shortAddress } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { type Side, SLIPPAGE_PCT } from "./order-ticket";

const USDC_MINT = solanaCluster().usdcMint;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: Side;
  token: Token;
  amount: string;
  price: number;
  receive: string;
  minReceive: string;
  swap: ReturnType<typeof useSwap>;
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="tabular min-w-0 break-all text-right font-mono text-xs">{value}</span>
    </div>
  );
}

function QuoteAsset({
  asset,
  value,
}: {
  asset: Pick<Token, "mint" | "symbol"> & Partial<Pick<Token, "imageUrl">>;
  value: string;
}) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        {"imageUrl" in asset ? (
          <AssetAvatar imageUrl={asset.imageUrl} className="size-4" />
        ) : (
          <TokenAssetAvatar mint={asset.mint} className="size-4" />
        )}
        {value}
      </span>
      <span className="block font-mono text-muted-foreground text-xs">{shortAddress(asset.mint)}</span>
    </>
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
  swap,
}: Props) {
  const { demoMode: DEMO_MODE } = useMarketDataMode();
  const from = side === "buy" ? { symbol: "USDC", mint: USDC_MINT } : token;
  const to = side === "buy" ? token : { symbol: "USDC", mint: USDC_MINT };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            Review {side} {token.symbol}
          </DialogTitle>
          <DialogDescription>
            Check every detail. Nothing is signed until you confirm in your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="text-[13px]">
          <Line label="From" value={<QuoteAsset asset={from} value={`${amount} ${from.symbol}`} />} />
          <Line
            label="To (estimated)"
            value={<QuoteAsset asset={to} value={receive === DASH ? DASH : `${receive} ${to.symbol}`} />}
          />
          <Line label="Minimum receive" value={minReceive === DASH ? DASH : `${minReceive} ${to.symbol}`} />
          <Separator className="my-2" />
          {!swap.quote && <Line label="Demo price" value={`${formatPrice(price)} / ${token.symbol}`} />}
          <Line label="Slippage" value={`${swap.quote ? swap.quote.slippageBps / 100 : SLIPPAGE_PCT}%`} />
          <Line label="Price impact" value={swap.reviewValues.priceImpact} />
          <Line label="Route fee" value={swap.reviewValues.routeFee} />
          <Line label="Platform fee" value={swap.reviewValues.platformFee} />
          <Line label="Network fee" value="Not quoted" />
          <Line label="Network" value="Solana" />
          <Line label="Value" value={formatUsd(swap.valueUsd)} />
        </div>
        {DEMO_MODE && (
          <div role="alert" className="flex gap-2 rounded-md bg-warning-subtle p-3 text-warning text-xs">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {swap.quote
              ? "Demo market data. Review amounts are provider quote estimates, not fixture prices. Sponsorship is not guaranteed by a quote."
              : "Demo data: fixture market prices. Estimates are not live quotes."}
          </div>
        )}
        {swap.status && (
          <p role="status" className="min-w-0 break-words text-warning text-xs">
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
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button disabled={swap.confirmDisabled} onClick={() => void swap.confirm()}>
            {swap.pending ? "Check swap status" : `Confirm ${side} ${token.symbol}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
