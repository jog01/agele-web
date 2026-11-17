"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLiveTokenPrice } from "@/hooks/use-live-token-price";
import { useToken } from "@/lib/api/queries";
import { ActivityPanel } from "./activity-panel";
import { AssetSummary } from "./asset-summary";
import { MarketExplorer } from "./market-explorer";
import { MarketContext, OrderTicket, PositionCard, type Side } from "./order-ticket";
import { PriceChart } from "./price-chart";
import { TopTraders } from "./top-traders";

export function Terminal({ mint }: { mint: string }) {
  const { data: token, isError } = useToken(mint);
  const livePrice = useLiveTokenPrice(mint, token);
  const price = livePrice ?? token?.priceUsd ?? null;
  const [sheetSide, setSheetSide] = useState<Side | null>(null);

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
        This market isn't supported or the API is unreachable.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 p-3 pb-20 md:h-full md:grid-cols-[minmax(0,1fr)_304px] xl:grid-cols-[264px_minmax(560px,1fr)_320px]">
      <div className="hidden min-h-0 flex-col gap-2 xl:flex">
        <MarketExplorer activeMint={mint} />
        <TopTraders />
      </div>
      <div className="flex min-h-0 flex-col gap-2 md:overflow-auto">
        <AssetSummary token={token} livePrice={livePrice} />
        <div className="flex h-[360px] flex-col md:h-auto md:min-h-[360px] md:flex-[3]">
          <PriceChart mint={mint} symbol={token?.symbol ?? ""} />
        </div>
        <ActivityPanel mint={mint} />
      </div>
      <aside className="hidden min-h-0 flex-col gap-2 md:flex md:overflow-auto">
        <OrderTicket key={mint} token={token} price={price} />
        <PositionCard symbol={token?.symbol ?? "token"} />
        <MarketContext token={token} />
      </aside>
      <div className="fixed inset-x-0 bottom-14 z-20 grid grid-cols-2 gap-2 border-t bg-sidebar p-3 md:hidden">
        <Button
          className="h-11 bg-positive text-positive-foreground hover:bg-positive/90"
          onClick={() => setSheetSide("buy")}
        >
          Buy {token?.symbol}
        </Button>
        <Button variant="secondary" className="h-11" onClick={() => setSheetSide("sell")}>
          Sell {token?.symbol}
        </Button>
      </div>
      <Sheet open={sheetSide !== null} onOpenChange={(open) => !open && setSheetSide(null)}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-auto">
          <SheetHeader>
            <SheetTitle>Trade {token?.symbol}</SheetTitle>
            <SheetDescription>Every order is reviewed before signing.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <OrderTicket key={sheetSide} token={token} price={price} initialSide={sheetSide ?? "buy"} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
