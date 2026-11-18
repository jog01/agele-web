import { LeaderboardLoading } from "@/components/leaderboard/leaderboard-view";
import { AppShell } from "@/components/shell/app-shell";

export default function Loading() {
  return (
    <AppShell section="leaderboard">
      <LeaderboardLoading />
    </AppShell>
  );
}
