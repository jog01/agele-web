import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/common/brand";
import { SignalMap } from "@/components/landing/signal-map";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "Agele — Markets move. People matter." },
  description:
    "A social trading terminal for Solana. Connect the chart with trader activity and market theses, then make your own move.",
};

export default function Home() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
      <a
        href="#main"
        className="sr-only rounded bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:z-10"
      >
        Skip to content
      </a>
      <header className="flex h-20 items-center justify-between border-b border-border/60">
        <Link
          href="/"
          aria-label="Agele home"
          className="rounded focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <Brand />
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-6 sm:gap-9">
          <Link
            href="/feed"
            className="hidden min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground sm:inline-flex"
          >
            The feed
          </Link>
          <Button asChild variant="outline" className="h-11 gap-3 rounded px-4 text-xs sm:text-sm">
            <Link href="/trade">
              Open terminal <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </nav>
      </header>
      <main id="main">
        <section
          aria-labelledby="hero-heading"
          className="relative grid items-center gap-2 pt-14 pb-10 sm:pt-20 sm:pb-14 lg:min-h-[680px] lg:grid-cols-[1.02fr_1fr] lg:gap-0 lg:py-16 xl:min-h-[750px]"
        >
          <div className="relative z-1">
            <p className="mb-7 flex items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase sm:text-xs">
              <span className="h-px w-7 bg-primary" aria-hidden />
              Solana markets. A shared perspective.
            </p>
            <h1
              id="hero-heading"
              className="max-w-[12ch] font-medium text-[clamp(3rem,5.4vw,5.4rem)] leading-[1.06] tracking-[-0.055em]"
            >
              Markets move.
              <br />
              <span className="text-primary">People matter.</span>
            </h1>
            <p className="mt-7 max-w-[390px] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mt-8">
              There’s a story behind every trade. See the market, follow the traders, and find your own point
              of view.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Button asChild size="lg" className="h-12 gap-5 rounded px-5 text-sm">
                <Link href="/trade">
                  Find your market <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Link
                href="/feed"
                className="inline-flex min-h-12 items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-foreground"
              >
                Explore the feed <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </div>
            <p className="mt-6 font-mono text-[10px] tracking-wide text-muted-foreground sm:text-[11px]">
              YOUR WALLET. YOUR DECISIONS.
            </p>
          </div>
          <SignalMap />
        </section>
        <section
          aria-labelledby="perspective-heading"
          className="grid gap-7 border-t border-border/60 py-9 sm:py-11 lg:grid-cols-[1fr_1.1fr] lg:gap-16"
        >
          <div>
            <p className="mb-3 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
              A wider view
            </p>
            <h2 id="perspective-heading" className="max-w-md font-medium text-2xl tracking-tight sm:text-3xl">
              The chart is only half the story.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
            <Link
              href="/trade"
              className="group rounded focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <h3 className="flex min-h-11 items-center justify-between font-medium text-sm">
                See the market{" "}
                <ArrowUpRight
                  className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                Charts, token activity and swap review. One focused trading desk.
              </p>
            </Link>
            <Link
              href="/leaderboard"
              className="group rounded focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <h3 className="flex min-h-11 items-center justify-between font-medium text-sm">
                Know the people{" "}
                <ArrowUpRight
                  className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                Discover traders, follow their activity and read the thinking behind a trade.
              </p>
            </Link>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-3 border-t border-border/60 py-6 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Agele · Built around your perspective.</span>
        <p className="max-w-md sm:text-right">
          Crypto assets are volatile. Data sources and trading availability are labelled in the terminal.
        </p>
      </footer>
    </div>
  );
}
