// @vitest-environment jsdom
import { createElement, Fragment, type ReactNode, Suspense } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { LeaderboardLoading } from "@/components/leaderboard/leaderboard-view";
import { PortfolioLoading } from "@/components/portfolio/portfolio-view";
import LeaderboardRouteLoading from "./leaderboard/loading";
import LeaderboardPage from "./leaderboard/page";
import PortfolioRouteLoading from "./portfolio/loading";
import PortfolioPage from "./portfolio/page";

vi.mock("@/components/shell/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
}));

it.each([
  { name: "portfolio", Page: PortfolioPage, Loading: PortfolioLoading, RouteLoading: PortfolioRouteLoading },
  {
    name: "leaderboard",
    Page: LeaderboardPage,
    Loading: LeaderboardLoading,
    RouteLoading: LeaderboardRouteLoading,
  },
])(
  "wires $name route navigation and Suspense to the same structured fallback",
  ({ name, Page, Loading, RouteLoading }) => {
    const boundary = Page().props.children;
    expect(boundary.type).toBe(Suspense);
    expect(boundary.props.fallback.type).toBe(Loading);
    const html = renderToString(createElement(RouteLoading));
    expect(html).toContain(`aria-label="Loading ${name}"`);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).not.toContain("$0");
  },
);
