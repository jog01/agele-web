import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <AppShell section="leaderboard">
      <Suspense>
        <LeaderboardView />
      </Suspense>
    </AppShell>
  );
}
