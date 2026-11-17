"use client";

import Image from "next/image";
import { useState } from "react";
import { getTokenAsset } from "@/lib/token-assets";
import { cn } from "@/lib/utils";

const PALETTE = ["#9ccbff", "#5de0aa", "#b9a4ef", "#f1c981", "#ff8195", "#7dd3fc"];

export function AssetAvatar({
  mint,
  symbol,
  className,
}: {
  mint?: string;
  symbol: string;
  className?: string;
}) {
  const asset = getTokenAsset(mint);
  const src = asset ? `/tokens/${asset.file}` : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const color = PALETTE[[...symbol].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-[11px] -outline-offset-1 outline-1 outline-white/10",
        className,
      )}
      style={{ color }}
    >
      {src && src !== failedSrc ? (
        <Image
          src={src}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          className="size-full object-contain"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        symbol.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
