import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { TraderProfileLoading, TraderProfileView } from "@/components/traders/trader-profile-view";
import { shortAddress } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/traders/[wallet]">): Promise<Metadata> {
  const { wallet } = await params;
  return { title: `Trader ${shortAddress(wallet, 6)}` };
}

async function TraderForParams({ params }: { params: PageProps<"/traders/[wallet]">["params"] }) {
  const { wallet } = await params;
  return <TraderProfileView key={wallet} wallet={wallet} />;
}

export default function TraderPage({ params }: PageProps<"/traders/[wallet]">) {
  return (
    <AppShell>
      <Suspense fallback={<TraderProfileLoading />}>
        <TraderForParams params={params} />
      </Suspense>
    </AppShell>
  );
}
