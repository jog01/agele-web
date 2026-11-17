import { DASH, formatPct } from "@/lib/format";
import type { SwapIssued } from "@/lib/swaps";

export function swapReviewValues(quote?: Pick<SwapIssued, "priceImpactPct" | "feeBps">) {
  const impact = quote?.priceImpactPct;
  const priceImpact =
    typeof impact === "number" && Number.isFinite(impact) && impact !== 0 && Math.abs(impact) < 0.01
      ? impact < 0
        ? ">-0.01%"
        : "<0.01%"
      : formatPct(impact, { signed: false });
  return {
    priceImpact,
    routeFee: quote ? formatPct(quote.feeBps / 100, { signed: false }) : DASH,
    platformFee: DASH,
  };
}
