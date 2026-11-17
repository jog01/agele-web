import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { Terminal } from "@/components/terminal/terminal";

async function TerminalForParams({ params }: { params: PageProps<"/trade/[mint]">["params"] }) {
  const { mint } = await params;
  return <Terminal mint={mint} />;
}

export default function TradePage(props: PageProps<"/trade/[mint]">) {
  return (
    <AppShell section="trade">
      <Suspense fallback={<div className="p-3 text-muted-foreground">Loading terminal…</div>}>
        <TerminalForParams params={props.params} />
      </Suspense>
    </AppShell>
  );
}
