"use client";

import { Coins } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function remoteImage(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

export function AssetAvatar({ imageUrl, className }: { imageUrl?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = remoteImage(imageUrl);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground -outline-offset-1 outline-1 outline-white/10",
        className,
      )}
    >
      {src && src !== failedSrc ? (
        // biome-ignore lint/performance/noImgElement: Provider URLs load in the browser, not the Next.js image proxy.
        <img
          src={src}
          alt=""
          width={48}
          height={48}
          referrerPolicy="no-referrer"
          className="size-full object-contain"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Coins className="size-3/5" />
      )}
    </span>
  );
}
