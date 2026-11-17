import { infiniteQueryOptions } from "@tanstack/react-query";
import type { SeriesMarker, UTCTimestamp } from "lightweight-charts";
import { fromBaseUnits } from "@/lib/amounts";
import { ApiError, api, type Token, unwrap } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";
import { type SocialAuth, socialHeaders, socialViewer } from "@/lib/api/social";
import { shortAddress } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";

export type SwapHistoryPage = paths["/v1/swaps"]["get"]["responses"][200]["content"]["application/json"];
export type SwapHistoryItem = SwapHistoryPage["items"][number];

export const swapHistoryKey = (auth: SocialAuth) => ["swaps", socialViewer(auth)] as const;

export async function listSwaps(auth: SocialAuth, cursor?: string, signal?: AbortSignal) {
  if (!auth.authenticated || (!auth.walletAddress && !auth.userLabel))
    throw new ApiError("Sign in to view your swaps", 401);
  return unwrap(
    await api.GET("/v1/swaps", {
      params: { query: { limit: 25, cursor } },
      headers: await socialHeaders(auth),
      signal,
    }),
  );
}

export function swapHistoryQuery(auth: SocialAuth) {
  return infiniteQueryOptions({
    queryKey: swapHistoryKey(auth),
    enabled: auth.authenticated && !!(auth.walletAddress || auth.userLabel),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listSwaps(auth, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function historyItems(pages: SwapHistoryPage[] = []) {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter((item) => {
      if (seen.has(item.requestId)) return false;
      seen.add(item.requestId);
      return true;
    });
}

export function swapSide(item: SwapHistoryItem, mint: string) {
  if (item.outputMint === mint && item.inputMint !== mint) return "buy" as const;
  if (item.inputMint === mint && item.outputMint !== mint) return "sell" as const;
  return undefined;
}

export function historySide(item: SwapHistoryItem, mint: string) {
  return (
    swapSide(item, mint) ??
    (item.inputMint === solanaCluster().usdcMint
      ? "buy"
      : item.outputMint === solanaCluster().usdcMint
        ? "sell"
        : "swap")
  );
}

export function swapAmount(
  amount: string,
  mint: string,
  token?: Pick<Token, "mint" | "symbol" | "decimals">,
) {
  const metadata =
    mint === solanaCluster().usdcMint
      ? { symbol: "USDC", decimals: 6 }
      : token?.mint === mint
        ? token
        : undefined;
  if (metadata) {
    try {
      return `${fromBaseUnits(amount, metadata.decimals)} ${metadata.symbol}`;
    } catch {
      /* Preserve raw values below. */
    }
  }
  return `${amount} base units (${shortAddress(mint)})`;
}

export function swapMarkers(items: SwapHistoryItem[], mint: string): SeriesMarker<UTCTimestamp>[] {
  return historyItems([{ items, nextCursor: null }])
    .flatMap((item) => {
      const side = swapSide(item, mint);
      const seconds = Math.floor(Date.parse(item.createdAt) / 1000);
      if (item.status !== "confirmed" || !side || !Number.isFinite(seconds)) return [];
      return [
        {
          id: item.requestId,
          time: seconds as UTCTimestamp,
          position: side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
          color: side === "buy" ? "#5de0aa" : "#ff8195",
          shape: side === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
          text: side === "buy" ? "Buy" : "Sell",
        },
      ];
    })
    .sort((a, b) => a.time - b.time);
}
