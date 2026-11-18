import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { TraderProfileLoading } from "@/components/traders/trader-profile-loading";
import { TraderProfileView } from "@/components/traders/trader-profile-view";
import { parseLeaderboardWindow } from "@/lib/api/leaderboard";
import { shortAddress } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/traders/[wallet]">): Promise<Metadata> {
  const { wallet } = await params;
  return { title: `Trader ${shortAddress(wallet, 6)}` };
}

async function TraderForParams({ params, searchParams }: PageProps<"/traders/[wallet]">) {
  const [{ wallet }, { window }] = await Promise.all([params, searchParams]);
  const initialWindow = parseLeaderboardWindow(typeof window === "string" ? window : null);
  return (
    <TraderProfileView key={`${wallet}:${initialWindow}`} wallet={wallet} initialWindow={initialWindow} />
  );
}

export default function TraderPage(props: PageProps<"/traders/[wallet]">) {
  return (
    <AppShell>
      <Suspense fallback={<TraderProfileLoading />}>
        <TraderForParams {...props} />
      </Suspense>
    </AppShell>
  );
}
