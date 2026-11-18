"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Deliberately illustrative geometry: not market data, prices or performance.
const LEVELS = [
  480, 468, 478, 450, 445, 461, 435, 415, 428, 405, 382, 395, 369, 350, 365, 337, 320, 340, 310, 285, 300,
  275, 250, 264, 238, 255, 225, 210, 230, 255, 240, 273, 290, 270, 300, 325, 310, 345, 360, 340, 374, 400,
  385, 420, 445, 430, 465, 490, 475, 505, 530, 512, 485, 500, 470, 450, 467, 490, 462, 480,
];

const TOKENS = [
  {
    name: "Bitcoin",
    src: "/landing/btc.png",
    position: "left-[8%] top-[9%] size-10 sm:left-[10%] sm:top-[20%] sm:size-14",
  },
  {
    name: "Ethereum",
    src: "/landing/eth.png",
    position: "right-[9%] top-[12%] size-10 sm:right-[11%] sm:top-[21%] sm:size-12",
  },
  {
    name: "Solana",
    src: "/tokens/sol.webp",
    position: "right-[10%] bottom-[13%] size-11 sm:right-[17%] sm:bottom-[17%] sm:size-14",
  },
  {
    name: "Pudgy Penguins",
    src: "/tokens/pengu.webp",
    position: "left-[10%] bottom-[14%] size-10 sm:left-[12%] sm:bottom-[17%] sm:size-12",
  },
  { name: "USDC", src: "/landing/usdc.png", position: "hidden right-[4%] top-[49%] size-9 sm:block" },
  { name: "Bonk", src: "/tokens/bonk.webp", position: "hidden left-[3%] top-[48%] size-9 sm:block" },
  { name: "Jupiter", src: "/tokens/jup.webp", position: "hidden left-[28%] top-[8%] size-8 sm:block" },
] as const;

function ChartSegment({ offset }: { offset: number }) {
  const points = LEVELS.map((level, index) => `${index * 24},${level}`).join(" ");
  return (
    <g transform={`translate(${offset} 0)`}>
      {LEVELS.map((level, index) => {
        const open = LEVELS[(index + LEVELS.length - 1) % LEVELS.length];
        const x = index * 24;
        const color = level <= open ? "var(--primary)" : "var(--negative)";
        return (
          <g key={`${x}-${level}`} fill={color} stroke={color}>
            <path d={`M${x} ${Math.min(open, level) - 14}V${Math.max(open, level) + 14}`} strokeWidth="1" />
            <rect
              x={x - 5}
              y={Math.min(open, level)}
              width="10"
              height={Math.max(Math.abs(open - level), 4)}
              rx="1"
            />
          </g>
        );
      })}
      <polyline
        points={`${points} 1440,${LEVELS[0]}`}
        stroke="var(--primary)"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
    </g>
  );
}

export function MarketBackdrop() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="agele-hero-backdrop pointer-events-none absolute inset-0" data-paused={paused}>
      <div id="agele-hero-scene" aria-hidden className="pointer-events-none absolute inset-0 select-none">
        <svg
          aria-hidden
          id="agele-hero-chart"
          viewBox="0 0 1440 680"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          className="absolute inset-0 size-full"
        >
          <defs>
            <pattern id="agele-hero-grid" width="96" height="80" patternUnits="userSpaceOnUse">
              <path d="M96 0H0V80" stroke="var(--border)" strokeOpacity="0.28" strokeWidth="1" />
            </pattern>
            <radialGradient id="agele-hero-legibility">
              <stop offset="0" stopColor="white" stopOpacity="0.1" />
              <stop offset="0.46" stopColor="white" stopOpacity="0.24" />
              <stop offset="0.78" stopColor="white" stopOpacity="0.7" />
              <stop offset="1" stopColor="white" />
            </radialGradient>
            <mask id="agele-hero-chart-mask">
              <rect width="1440" height="680" fill="url(#agele-hero-legibility)" />
            </mask>
          </defs>
          <rect width="1440" height="680" fill="url(#agele-hero-grid)" />
          <g mask="url(#agele-hero-chart-mask)" opacity="0.38">
            <g
              className="agele-hero-market-track motion-safe:animate-[agele-hero-market-drift_200s_linear_infinite]"
              style={{ animationPlayState: paused ? "paused" : "running" }}
            >
              <ChartSegment offset={0} />
              <ChartSegment offset={1440} />
            </g>
          </g>
        </svg>
        {TOKENS.map(({ name, src, position }, index) => (
          <div
            key={name}
            data-token={name}
            className={`absolute overflow-hidden rounded-full bg-background opacity-75 outline-1 -outline-offset-1 outline-white/10 motion-safe:animate-[agele-hero-token-float_10s_ease-in-out_infinite] ${position}`}
            style={{
              animationDuration: `${10 + index * 1.2}s`,
              animationDelay: `${index * -1.7}s`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            <Image
              src={src}
              alt=""
              width={64}
              height={64}
              loading="eager"
              className="size-full rounded-full object-cover"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-controls="agele-hero-scene"
        className="pointer-events-auto absolute right-4 bottom-4 z-2 flex min-h-11 items-center gap-2 rounded px-3 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground motion-reduce:hidden sm:right-6 sm:bottom-5"
      >
        {paused ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
        {paused ? "Resume background" : "Pause background"}
      </button>
    </div>
  );
}
