import type { Metadata } from "next";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <AppShell section="leaderboard">
      <LeaderboardView />
    </AppShell>
  );
}
