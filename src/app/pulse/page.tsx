import type { Metadata } from "next";
import { PulseBoard } from "@/components/pulse/pulse-board";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Pulse" };

export default function PulsePage() {
  return (
    <AppShell section="pulse">
      <PulseBoard />
    </AppShell>
  );
}
