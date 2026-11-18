import { AppShell } from "@/components/shell/app-shell";
import { TraderProfileLoading } from "@/components/traders/trader-profile-loading";

export default function Loading() {
  return (
    <AppShell>
      <TraderProfileLoading />
    </AppShell>
  );
}
