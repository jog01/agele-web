// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import type { components } from "@/lib/api/schema";
import { TraderMostLikedThesis } from "./trader-most-liked-thesis";
import { TraderTopTrades } from "./trader-top-trades";

const originalUrl = window.location.href;
const thesis: NonNullable<components["schemas"]["TraderProfile"]["mostLikedThesis"]> = {
  positionId: "closed-episode",
  newerVersionCount: 1,
  post: {
    id: "version",
    thesisId: "thread",
    wallet: "trader-wallet",
    handle: "northstar",
    avatarUrl: null,
    source: "demo",
    mint: "sol-mint",
    symbol: "SOL",
    imageUrl: "https://example.com/sol.png",
    position: "long",
    createdAt: 1700000000,
    kind: "thesis",
    viewCount: 84,
    discussionKey: null,
    parentId: null,
    pinned: true,
    body: "Watching the first pullback.",
    likes: 3,
    replyCount: 1,
  },
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", originalUrl);
});

it("opens the featured thesis in its actual position while preserving the profile destination", () => {
  window.history.replaceState(null, "", "/traders/trader-wallet?window=30d#activity");
  render(createElement(TraderMostLikedThesis, { wallet: "trader-wallet", thesis }));
  fireEvent.click(
    screen.getByRole("button", {
      name: /Watching the first pullback.*Likes 3.*Replies 1.*Views 84.*Open thread/,
    }),
  );
  const url = new URL(window.location.href);
  expect(url.pathname).toBe("/traders/trader-wallet");
  expect(url.hash).toBe("#activity");
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    window: "30d",
    trader: "trader-wallet",
    mint: "sol-mint",
    position: "closed-episode",
    thesis: "thread",
  });
});

it("opens a best trade's closed episode instead of the latest token market", () => {
  render(
    createElement(TraderTopTrades, {
      wallet: "trader-wallet",
      trades: [
        {
          positionId: "historical-episode",
          mint: "sol-mint",
          symbol: "SOL",
          imageUrl: "https://example.com/sol.png",
          closedAt: 1700000000,
          realizedPnlUsd: 80,
          realizedPnlPct: 8,
        },
      ],
    }),
  );
  fireEvent.click(screen.getByRole("button"));
  expect(new URLSearchParams(window.location.search).get("position")).toBe("historical-episode");
  expect(new URLSearchParams(window.location.search).get("trader")).toBe("trader-wallet");
});
