import { ArrowRight, LineChart, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/config";

const BENEFITS = [
  {
    icon: LineChart,
    title: "One focused desk",
    body: "Chart, activity and order entry for supported Solana markets.",
  },
  {
    icon: Users,
    title: "Traders, in context",
    body: "See who is buying, read their thesis, follow their process.",
  },
  {
    icon: ShieldCheck,
    title: "Review every trade",
    body: "Every swap shows fees, slippage and route before you sign.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-12 px-6 py-16">
      <div className="flex items-center gap-2 font-semibold text-[15px]">
        <span className="inline-block size-5 rounded-md bg-primary" aria-hidden />
        {PRODUCT_NAME}
      </div>
      <div className="space-y-4">
        <h1 className="font-semibold text-5xl tracking-tight">Markets move. Stay connected.</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          A social trading terminal for Solana: trade supported tokens with USDC and learn from the people
          behind the trades.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/trade">
            Explore terminal <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-lg border bg-card p-4">
            <Icon className="mb-3 size-5 text-primary" aria-hidden />
            <h2 className="font-semibold text-[15px]">{title}</h2>
            <p className="mt-1 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        v0.1 preview runs on demo data; trading is disabled. Crypto assets are volatile and you can lose
        money.
      </p>
    </main>
  );
}
