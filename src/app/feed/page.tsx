import type { Metadata } from "next";
import { FeedView } from "@/components/feed/feed-view";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <AppShell section="feed">
      <FeedView />
    </AppShell>
  );
}
