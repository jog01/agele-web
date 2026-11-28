import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardLoading, LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { AppShell } from "@/components/shell/app-shell";
import "./positions-leaderboard.css";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <AppShell section="leaderboard">
      <Suspense fallback={<LeaderboardLoading />}>
        <LeaderboardView />
      </Suspense>
    </AppShell>
  );
}
