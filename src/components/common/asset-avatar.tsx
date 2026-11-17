import { cn } from "@/lib/utils";

const PALETTE = ["#9ccbff", "#5de0aa", "#b9a4ef", "#f1c981", "#ff8195", "#7dd3fc"];

/** Initials fallback; remote token images stay off until an image proxy/allowlist exists. */
export function AssetAvatar({ symbol, className }: { symbol: string; className?: string }) {
  const color = PALETTE[[...symbol].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-[11px]",
        className,
      )}
      style={{ color }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
