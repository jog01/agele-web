import Image from "next/image";

// Conceptual geometry, not financial data or a screenshot of the terminal.
const CANDLES = [
  [158, 349, 25, 10],
  [180, 329, 33, -14],
  [202, 335, 26, 12],
  [224, 316, 39, -20],
  [246, 292, 35, -22],
  [268, 301, 28, 13],
  [290, 308, 31, 12],
  [312, 286, 37, -24],
  [334, 266, 30, -18],
  [356, 273, 32, 11],
  [378, 278, 24, 10],
  [400, 253, 42, -23],
  [422, 240, 31, -15],
  [444, 250, 27, 12],
  [466, 229, 36, -20],
  [488, 208, 38, -22],
  [510, 218, 32, 15],
  [532, 198, 37, -18],
] as const;

function Person({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="19" fill="var(--card)" stroke="var(--input)" strokeOpacity="0.6" />
      <circle cy="-4" r="4" fill="none" stroke="var(--foreground)" strokeWidth="1.4" />
      <path d="M-7 9v-2a7 7 0 0 1 14 0v2" fill="none" stroke="var(--foreground)" strokeWidth="1.4" />
    </g>
  );
}

export function SignalMap() {
  return (
    <figure
      aria-label="An illustrated network of people and market theses connected to a Solana market chart"
      className="pointer-events-none relative -mx-4 mt-3 min-w-0 select-none sm:mx-0 lg:-ml-8 lg:mt-0 lg:-mr-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
    >
      <svg viewBox="0 0 640 570" fill="none" aria-hidden className="h-auto w-full overflow-visible">
        <defs>
          <pattern id="agele-signal-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="var(--muted-foreground)" fillOpacity="0.2" />
          </pattern>
          <linearGradient
            id="agele-signal-fade"
            x1="320"
            x2="320"
            y1="60"
            y2="520"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.35" stopColor="white" />
            <stop offset="0.8" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="agele-signal-mask">
            <rect width="640" height="570" fill="url(#agele-signal-fade)" />
          </mask>
        </defs>
        <rect
          x="24"
          y="32"
          width="600"
          height="510"
          fill="url(#agele-signal-grid)"
          mask="url(#agele-signal-mask)"
        />
        <g stroke="var(--primary)" strokeOpacity="0.3" strokeWidth="1">
          <path d="M107 199H188Q207 199 207 220V252Q207 271 228 271H292" />
          <path d="M278 107V145Q278 165 298 165H356Q378 165 378 188V238" />
          <path d="M523 136V150Q523 174 499 174H489V193" />
          <path d="M105 436H197Q219 436 219 414V390Q219 370 242 370H334V300" />
          <path d="M481 440V395Q481 374 460 374H422V283" />
        </g>
        <g fill="var(--primary)">
          <circle cx="207" cy="238" r="3" />
          <circle cx="356" cy="165" r="3" />
          <circle cx="219" cy="410" r="3" />
          <circle cx="481" cy="414" r="3" />
        </g>
        <path
          d="M128 381H566M128 314H566M128 247H566M128 180H566"
          stroke="var(--border)"
          strokeOpacity="0.6"
        />
        <path d="M128 166V390H566" stroke="var(--input)" strokeOpacity="0.45" />
        {CANDLES.map(([x, y, wick, change]) => (
          <g key={x} stroke={change < 0 ? "var(--primary)" : "var(--muted-foreground)"}>
            <path d={`M${x} ${y - wick / 2}V${y + wick / 2}`} strokeOpacity="0.75" />
            <rect
              x={x - 4}
              y={y - Math.abs(change) / 2}
              width="8"
              height={Math.abs(change)}
              rx="1"
              fill={change < 0 ? "var(--primary)" : "var(--card)"}
            />
          </g>
        ))}
        <path
          d="M139 361C190 361 185 315 227 322S264 334 302 299S344 283 370 286S406 237 444 253S484 205 543 206"
          stroke="var(--primary)"
          strokeOpacity="0.15"
          strokeWidth="22"
        />
        <path d="M532 198H589" stroke="var(--primary)" strokeDasharray="3 5" strokeOpacity="0.7" />
        <circle cx="532" cy="198" r="5" fill="var(--primary)" stroke="var(--background)" strokeWidth="3" />
        <g fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.5" fill="var(--muted-foreground)">
          <text x="139" y="412">
            THE MARKET
          </text>
          <text x="529" y="412">
            YOUR VIEW
          </text>
        </g>
        <Person x={107} y={199} />
        <Person x={278} y={88} />
        <Person x={105} y={436} />
        <Person x={481} y={459} />
        <g fontFamily="var(--font-sans)" fontSize="11" fill="var(--muted-foreground)">
          <text x="56" y="163">
            Trader activity
          </text>
          <text x="250" y="54">
            Shared theses
          </text>
          <text x="55" y="477">
            Different perspectives
          </text>
          <text x="449" y="499">
            Your next move
          </text>
        </g>
        <g transform="translate(369 66)">
          <rect width="224" height="69" rx="7" fill="var(--card)" stroke="var(--border)" />
          <path d="M19 20h21v15H29l-7 5v-5h-3z" stroke="var(--primary)" strokeWidth="1.3" />
          <text
            x="52"
            y="27"
            fill="var(--foreground)"
            fontFamily="var(--font-sans)"
            fontSize="12"
            fontWeight="500"
          >
            What’s behind the move?
          </text>
          <path
            d="M52 40H174M52 48H146"
            stroke="var(--input)"
            strokeOpacity="0.6"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </g>
        <g transform="translate(49 279)">
          <rect width="160" height="52" rx="6" fill="var(--card)" stroke="var(--border)" />
          <circle cx="24" cy="26" r="12" fill="var(--background)" />
          <path d="m20 23 4 4 7-8M18 31h12" stroke="var(--primary)" strokeWidth="1.4" />
          <text
            x="46"
            y="24"
            fill="var(--foreground)"
            fontFamily="var(--font-sans)"
            fontSize="11"
            fontWeight="500"
          >
            Follow the thinking.
          </text>
          <text x="46" y="39" fill="var(--muted-foreground)" fontFamily="var(--font-sans)" fontSize="10">
            Not just the price.
          </text>
        </g>
      </svg>
      <div
        aria-hidden
        className="absolute top-[27%] left-[65%] flex items-center gap-2.5 rounded border border-border bg-card px-3 py-2"
      >
        <Image src="/tokens/sol.webp" alt="" width={26} height={26} className="size-[26px] rounded-full" />
        <div>
          <p className="font-mono text-[11px] leading-4 text-foreground">SOL</p>
          <p className="text-[9px] leading-3 text-muted-foreground">Solana</p>
        </div>
      </div>
      <figcaption className="absolute right-5 bottom-1 font-mono text-[9px] tracking-wide text-muted-foreground sm:right-6 lg:bottom-0">
        SOCIAL MARKET MAP / ILLUSTRATION
      </figcaption>
    </figure>
  );
}
