// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PulseSnapshot, PulseToken } from "@/lib/api/pulse";
import { PulseBoard, PulseLoading } from "./pulse-board";

const query = vi.hoisted(() => ({ data: undefined as PulseSnapshot | undefined, isPending: false }));
vi.mock("@/hooks/use-pulse", () => ({ usePulse: () => query }));
vi.mock("@/hooks/use-now", () => ({ useNow: () => 300_000 }));
vi.mock("@/components/terminal/use-panel-layout", () => ({
  usePanelSize: () => ({ ref: () => {}, width: 1120 }),
}));

const token: PulseToken = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Solana",
  imageUrl: null,
  creator: "creator",
  stage: "new",
  venue: "pump.fun",
  launchedAt: 271,
  curveProgressBps: 1_500,
  migratedAt: null,
  migratedVenue: null,
  priceUsd: 1,
  marketCapUsd: 8_200,
  volume24hUsd: 2_400,
  liquidityUsd: 400,
  holders: 12,
  txCount24h: 14,
  buys24h: 10,
  sells24h: 4,
};

afterEach(() => {
  cleanup();
  query.data = undefined;
});

it("renders a structured loading state without synthetic data", () => {
  const { container } = render(<PulseLoading />);
  expect(screen.getByRole("region", { name: "Pulse" }).getAttribute("aria-busy")).toBe("true");
  expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull();
  expect(screen.queryByText("Demo")).toBeNull();
});

it("renders exact lifecycle rows and lets mobile readers select a lane", () => {
  const migrated: PulseToken = {
    ...token,
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    stage: "migrated",
    migratedAt: 290,
    migratedVenue: "pumpswap",
  };
  query.data = { source: "demo", new: [token], finalStretch: [], migrated: [migrated] };
  const { container } = render(<PulseBoard />);
  const lane = within(container.querySelector('[data-selected="true"]') as HTMLElement);
  expect(lane.getByRole("link", { name: /view Solana/i }).getAttribute("href")).toBe(`/trade/${token.mint}`);
  expect(lane.getByRole("progressbar", { name: "Bonding curve" }).getAttribute("value")).toBe("15");
  expect(lane.getByText("29s")).toBeDefined();
  expect(lane.getByText("Vol 24h")).toBeDefined();
  expect(screen.getByText("Demo")).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: /migrated/i }));
  const migratedLane = within(container.querySelector('[data-selected="true"]') as HTMLElement);
  expect(migratedLane.getByText("Migrated to PumpSwap")).toBeDefined();
  expect(migratedLane.getByText("10s")).toBeDefined();
  expect(migratedLane.queryByRole("progressbar")).toBeNull();
});

it("holds the visible snapshot until the reader resumes updates", () => {
  query.data = { source: "indexed", new: [token], finalStretch: [], migrated: [] };
  const { rerender } = render(<PulseBoard />);
  fireEvent.click(screen.getByRole("button", { name: /pause updates/i }));
  query.data = { ...query.data, new: [] };
  rerender(<PulseBoard />);
  expect(screen.getByText("Solana")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /resume updates/i }));
  expect(screen.queryByText("Solana")).toBeNull();
});
