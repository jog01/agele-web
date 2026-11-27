import { PulseLoading } from "@/components/pulse/pulse-board";
import { AppShell } from "@/components/shell/app-shell";

export default function Loading() {
  return (
    <AppShell section="pulse">
      <PulseLoading />
    </AppShell>
  );
}
