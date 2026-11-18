import { PortfolioLoading } from "@/components/portfolio/portfolio-view";
import { AppShell } from "@/components/shell/app-shell";

export default function Loading() {
  return (
    <AppShell section="portfolio">
      <PortfolioLoading />
    </AppShell>
  );
}
