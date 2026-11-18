import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/common/brand";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  {
    title: "One focused desk",
    body: "Chart, activity and order entry for supported Solana markets.",
  },
  {
    title: "Traders, in context",
    body: "See who is buying, read their thesis, follow their process.",
  },
  {
    title: "Review every trade",
    body: "Every swap shows fees, slippage and route before you sign.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col px-6 md:px-10">
      <header className="flex min-h-24 items-center justify-between border-b border-border/60">
        <Link
          href="/"
          aria-label="Agele home"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <Brand />
        </Link>
        <Link
          href="/trade"
          className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
        >
          Open terminal <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>
      <section className="grid flex-1 items-center gap-12 py-20 md:grid-cols-[1fr_240px] md:py-28">
        <div>
          <p className="mb-5 font-mono text-xs tracking-[0.12em] text-primary uppercase">Solana. Together.</p>
          <h1 className="max-w-3xl font-semibold text-5xl leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Markets move.
            <br />
            <span className="text-primary">Stay connected.</span>
          </h1>
          <p className="mt-7 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            A focused trading terminal for Solana. Find your market, see the people behind the trades, and
            build your own perspective.
          </p>
          <Button asChild size="lg" className="mt-9 h-12 gap-4 rounded-lg px-5 text-sm">
            <Link href="/trade">
              Explore terminal <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <div
          aria-hidden
          className="pointer-events-none hidden aspect-square select-none items-center justify-center rounded-full bg-accent/40 md:flex"
        >
          <Image src="/agele-mark.svg" alt="" width={160} height={160} className="size-40" />
        </div>
      </section>
      <ul className="grid gap-8 border-t border-border/60 py-10 sm:grid-cols-3 sm:gap-10">
        {BENEFITS.map(({ title, body }, index) => (
          <li key={title}>
            <span className="font-mono text-xs text-primary">0{index + 1}</span>
            <h2 className="mt-4 font-semibold text-base">{title}</h2>
            <p className="mt-2 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
      <p className="border-t border-border/60 py-6 text-xs leading-relaxed text-muted-foreground">
        Preview · Data sources and trading availability are labelled in the terminal. Crypto assets are
        volatile and you can lose money.
      </p>
    </main>
  );
}
