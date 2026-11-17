import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <AppShell section="portfolio">
      <PortfolioView />
    </AppShell>
  );
}
