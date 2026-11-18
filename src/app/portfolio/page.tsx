import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioLoading, PortfolioView } from "@/components/portfolio/portfolio-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <AppShell section="portfolio">
      <Suspense fallback={<PortfolioLoading />}>
        <PortfolioView />
      </Suspense>
    </AppShell>
  );
}
