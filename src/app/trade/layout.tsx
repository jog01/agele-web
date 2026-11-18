import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { TerminalSkeleton } from "@/components/terminal/panel-skeleton";
import { TerminalRoute } from "@/components/terminal/terminal-route";

export default function TradeLayout({ children }: LayoutProps<"/trade">) {
  return (
    <AppShell section="trade">
      <Suspense fallback={<TerminalSkeleton />}>
        <TerminalRoute />
      </Suspense>
      {children}
    </AppShell>
  );
}
