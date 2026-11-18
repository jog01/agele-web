import { FeedLoading } from "@/components/feed/feed-loading";
import { AppShell } from "@/components/shell/app-shell";

export default function Loading() {
  return (
    <AppShell section="feed">
      <FeedLoading />
    </AppShell>
  );
}
