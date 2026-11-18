// Token-derived colors are part of this illustration, not changes to UI tokens.
const TOKENS = {
  btc: { src: "/landing/btc.png", color: "#F7931A" },
  eth: { src: "/landing/eth.png", color: "#627EEA" },
  sol: { src: "/tokens/sol.webp", color: "#14F195" },
  usdc: { src: "/landing/usdc.png", color: "#2775CA" },
  jup: { src: "/tokens/jup.webp", color: "#B6EF75" },
  bonk: { src: "/tokens/bonk.webp", color: "#F5A524" },
  pengu: { src: "/tokens/pengu.webp", color: "#8ACBEB" },
} as const;

type Token = keyof typeof TOKENS;

function Coin({
  token,
  x,
  y,
  radius,
  tilt = 0,
}: {
  token: Token;
  x: number;
  y: number;
  radius: number;
  tilt?: number;
}) {
  const { src, color } = TOKENS[token];
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <ellipse
        cy={radius * 0.92}
        rx={radius * 1.02}
        ry={radius * 0.2}
        fill="var(--background)"
        fillOpacity="0.75"
      />
      <g transform="scale(1 .79)">
        <circle cy="16" r={radius} fill={color} fillOpacity="0.4" />
        <path d={`M${-radius} 0v16M${radius} 0v16`} stroke={color} strokeOpacity="0.5" strokeWidth="2" />
        <circle r={radius} fill={color} />
        <circle r={radius - 3} fill="var(--card)" />
        <circle r={radius - 8} fill={color} />
        <image href={src} x={-radius * 0.8} y={-radius * 0.8} width={radius * 1.6} height={radius * 1.6} />
        <circle r={radius - 1} stroke="white" strokeOpacity="0.23" />
        <path
          d={`M${-radius * 0.87} ${-radius * 0.25}A${radius * 0.91} ${radius * 0.91} 0 0 1 ${radius * 0.6} ${-radius * 0.69}`}
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Person({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="16" fill="var(--background)" stroke={color} strokeOpacity="0.65" />
      <circle cy="-4" r="3.5" fill="none" stroke="var(--foreground)" strokeOpacity="0.8" strokeWidth="1.4" />
      <path
        d="M-6 8v-1a6 6 0 0 1 12 0v1"
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity="0.8"
        strokeWidth="1.4"
      />
    </g>
  );
}

function Scene({ compact = false }: { compact?: boolean }) {
  const cx = compact ? 330 : 600;
  const cy = compact ? 216 : 225;
  const orbit = compact ? 266 : 510;
  return (
    <svg
      viewBox={compact ? "0 0 660 450" : "0 0 1200 430"}
      fill="none"
      aria-hidden
      className={compact ? "h-auto w-full sm:hidden" : "hidden h-auto w-full sm:block"}
    >
      {/* Solid, layered trajectories make a shared market—not a price chart. */}
      <g transform={`rotate(-10 ${cx} ${cy})`}>
        <ellipse
          cx={cx}
          cy={cy + 37}
          rx={orbit}
          ry={compact ? 132 : 145}
          stroke="var(--border)"
          strokeOpacity="0.55"
        />
        <ellipse
          cx={cx}
          cy={cy + 37}
          rx={orbit - 32}
          ry={compact ? 105 : 117}
          stroke="var(--border)"
          strokeOpacity="0.3"
        />
        <path
          d={`M${cx - orbit} ${cy + 37}A${orbit} ${compact ? 132 : 145} 0 0 0 ${cx + orbit} ${cy + 37}`}
          stroke="#2775CA"
          strokeOpacity="0.22"
          strokeWidth="16"
        />
        <path
          d={`M${cx - orbit + 32} ${cy + 37}A${orbit - 32} ${compact ? 105 : 117} 0 0 1 ${cx + orbit - 32} ${cy + 37}`}
          stroke="#F7931A"
          strokeOpacity="0.19"
          strokeWidth="12"
        />
      </g>
      <path
        d={`M${cx - orbit + 20} ${cy + 40}C${cx - 200} ${cy - 52} ${cx + 200} ${cy + 175} ${cx + orbit - 20} ${cy - 45}`}
        stroke="#627EEA"
        strokeOpacity="0.4"
        strokeWidth="3"
      />
      <path
        d={`M${cx - orbit + 50} ${cy + 80}C${cx - 110} ${cy + 160} ${cx + 90} ${cy - 115} ${cx + orbit - 40} ${cy - 65}`}
        stroke="#14F195"
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <g stroke="var(--primary)" strokeOpacity="0.17">
        <path d={`M${cx} ${cy - 128}v256M${cx - 160} ${cy}h320`} />
        <ellipse cx={cx} cy={cy + 11} rx="151" ry="89" />
      </g>
      {compact ? (
        <>
          <Coin token="jup" x={286} y={68} radius={35} tilt={-13} />
          <Coin token="eth" x={535} y={130} radius={52} tilt={13} />
          <Person x={74} y={92} color="#F7931A" />
          <Person x={425} y={77} color="#627EEA" />
          <Coin token="btc" x={127} y={217} radius={65} tilt={-13} />
        </>
      ) : (
        <>
          <Coin token="jup" x={430} y={92} radius={44} tilt={-12} />
          <Coin token="eth" x={899} y={132} radius={66} tilt={14} />
          <Coin token="pengu" x={1097} y={225} radius={39} tilt={-11} />
          <Person x={154} y={119} color="#F7931A" />
          <Person x={730} y={63} color="#627EEA" />
          <Person x={1045} y={85} color="#2775CA" />
          <Coin token="btc" x={259} y={230} radius={82} tilt={-14} />
        </>
      )}
      {/* Agele is the meeting point; no invented traders or financial output. */}
      <g transform={`translate(${cx} ${cy})`}>
        <ellipse cy="66" rx="113" ry="57" fill="var(--background)" />
        <path d="M-106-1v38c0 47 212 47 212 0V-1" fill="var(--card)" stroke="var(--border)" />
        <ellipse cy="-1" rx="106" ry="67" fill="var(--accent)" stroke="var(--primary)" strokeOpacity="0.65" />
        <ellipse
          cy="-1"
          rx="96"
          ry="59"
          fill="var(--background)"
          stroke="var(--primary)"
          strokeOpacity="0.15"
        />
        <image href="/agele-mark.svg" x="-51" y="-42" width="102" height="80" />
        <path d="M-72 55c42 18 102 18 144 0" stroke="var(--primary)" strokeOpacity="0.2" />
        <path
          d="M-64 60v9M-48 64v9M-32 67v9M-16 69v9M0 70v9M16 69v9M32 67v9M48 64v9M64 60v9"
          stroke="var(--input)"
          strokeOpacity="0.35"
        />
      </g>
      {compact ? (
        <>
          <Coin token="usdc" x={129} y={365} radius={41} tilt={10} />
          <Coin token="sol" x={478} y={343} radius={63} tilt={-11} />
          <Coin token="bonk" x={593} y={278} radius={33} tilt={14} />
          <Person x={299} y={369} color="#14F195" />
        </>
      ) : (
        <>
          <Coin token="bonk" x={100} y={320} radius={37} tilt={13} />
          <Coin token="usdc" x={1037} y={329} radius={57} tilt={9} />
          <Coin token="sol" x={788} y={334} radius={75} tilt={-12} />
          <Person x={443} y={344} color="#14F195" />
          <Person x={911} y={388} color="#2775CA" />
        </>
      )}
      <g fill="var(--primary)" fillOpacity="0.65">
        <circle cx={cx - 158} cy={cy - 39} r="2.5" />
        <circle cx={cx + 171} cy={cy + 43} r="2.5" />
      </g>
    </svg>
  );
}

export function CryptoScene() {
  return (
    <figure
      aria-label="A colorful crypto illustration: Bitcoin, Ethereum, Solana, USDC, Jupiter, Bonk and Pudgy Penguins coins and independent people connected around Agele"
      className="pointer-events-none relative -mx-5 mt-5 select-none sm:-mx-8 sm:mt-6 lg:-mx-10"
    >
      <Scene />
      <Scene compact />
      <figcaption className="mt-1 text-center font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase sm:mt-0 sm:text-[11px]">
        Independent minds. Connected perspectives.
      </figcaption>
    </figure>
  );
}
