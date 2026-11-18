"use client";

import { type CSSProperties, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLiveTokenPrice } from "@/hooks/use-live-token-price";
import { useToken } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import { ActivityPanel } from "./activity-panel";
import { AssetSummary } from "./asset-summary";
import { MarketExplorer } from "./market-explorer";
import { MarketContext, OrderTicket, type Side } from "./order-ticket";
import { PanelResizer } from "./panel-resizer";
import { PriceChart } from "./price-chart";
import { clamp, DEFAULT_LAYOUT, usePanelLayout, usePanelSize } from "./use-panel-layout";
import "./terminal.css";

export function Terminal({ mint }: { mint: string }) {
  const { data: token, isError } = useToken(mint);
  const livePrice = useLiveTokenPrice(mint, token);
  const price = livePrice ?? token?.priceUsd ?? null;
  const [sheetSide, setSheetSide] = useState<Side | null>(null);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const id = useId();
  const { layout, update } = usePanelLayout();
  const workspace = usePanelSize();
  const center = usePanelSize();
  const rail = usePanelSize();
  const marketsMax = clamp((workspace.width || 1440) - 660, 200, 380);
  const markets = explorerCollapsed ? 48 : clamp(layout.markets, 200, marketsMax);
  const ticketMax = clamp(
    (workspace.width || 1440) - (workspace.width >= 1024 ? markets + 12 : 6) - 360,
    260,
    440,
  );
  const ticket = clamp(layout.ticket, 260, ticketMax);
  const chartMax = Math.max(220, center.height - 166);
  const chart = clamp((center.height - 6) * layout.chart, 220, chartMax);
  const orderMax = Math.max(230, rail.height - 106);
  const order = clamp((rail.height - 6) * layout.order, 230, orderMax);

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
        This market isn't supported or the API is unreachable.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "terminal-workspace grid min-h-0 min-w-0 grid-cols-1 p-1 pb-24 md:h-full md:min-h-[480px] md:pb-1",
      )}
      ref={workspace.ref}
      style={{ "--markets-width": `${markets}px`, "--ticket-width": `${ticket}px` } as CSSProperties}
    >
      <div
        id={`${id}-markets`}
        className="terminal-markets hidden min-h-0 min-w-0 overflow-hidden lg:flex [&>section]:h-full [&>section]:w-full"
      >
        <MarketExplorer
          activeMint={mint}
          collapsed={explorerCollapsed}
          onToggle={() => setExplorerCollapsed((v) => !v)}
        />
      </div>
      <PanelResizer
        label="Resize markets"
        controls={`${id}-markets`}
        value={markets}
        min={explorerCollapsed ? 48 : 200}
        max={explorerCollapsed ? 48 : marketsMax}
        onChange={(markets) => update({ markets })}
        onReset={() => update({ markets: DEFAULT_LAYOUT.markets })}
        className="hidden lg:block"
      />
      <div className="terminal-center flex min-h-0 min-w-0 flex-col gap-1">
        <AssetSummary token={token} livePrice={livePrice} />
        <div ref={center.ref} className="flex min-h-0 flex-1 flex-col">
          <div
            id={`${id}-chart`}
            className="terminal-chart flex h-[360px] min-h-0 shrink-0 flex-col"
            style={{ "--panel-height": `${chart}px` } as CSSProperties}
          >
            <PriceChart mint={mint} symbol={token?.symbol ?? ""} />
          </div>
          <PanelResizer
            label="Resize chart and activity"
            controls={`${id}-chart ${id}-activity`}
            orientation="horizontal"
            value={chart}
            min={220}
            max={chartMax}
            onChange={(height) => update({ chart: height / Math.max(1, center.height - 6) })}
            onReset={() => update({ chart: DEFAULT_LAYOUT.chart })}
            className="hidden w-full md:block"
          />
          <div
            id={`${id}-activity`}
            className="terminal-activity mt-1 flex min-h-[300px] min-w-0 flex-1 flex-col md:mt-0 md:min-h-0"
          >
            <ActivityPanel mint={mint} />
          </div>
        </div>
      </div>
      <PanelResizer
        label="Resize order rail"
        controls={`${id}-rail`}
        value={ticket}
        min={260}
        max={ticketMax}
        reverse
        onChange={(ticket) => update({ ticket })}
        onReset={() => update({ ticket: DEFAULT_LAYOUT.ticket })}
        className="hidden md:block"
      />
      <aside
        id={`${id}-rail`}
        ref={rail.ref}
        className="terminal-rail hidden min-h-0 min-w-0 flex-col md:flex"
      >
        <div
          id={`${id}-order`}
          className="min-h-0 shrink-0 overflow-auto overscroll-contain rounded-md border bg-card"
          style={{ height: `${order}px` }}
        >
          <OrderTicket key={mint} token={token} price={price} />
        </div>
        <PanelResizer
          label="Resize order and market details"
          controls={`${id}-order ${id}-context`}
          orientation="horizontal"
          value={order}
          min={230}
          max={orderMax}
          onChange={(height) => update({ order: height / Math.max(1, rail.height - 6) })}
          onReset={() => update({ order: DEFAULT_LAYOUT.order })}
          className="w-full"
        />
        <div
          id={`${id}-context`}
          className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border bg-card"
        >
          <MarketContext token={token} />
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 grid grid-cols-2 gap-2 border-t bg-sidebar p-3 md:hidden">
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
