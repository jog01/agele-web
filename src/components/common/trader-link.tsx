import Link from "next/link";
import type { LeaderboardWindow } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function TraderLink({
  wallet,
  handle,
  window,
  className,
}: {
  wallet: string;
  handle: string;
  window?: LeaderboardWindow;
  className?: string;
}) {
  return (
    <Link
      href={`/traders/${encodeURIComponent(wallet)}${window ? `?window=${window}` : ""}`}
      className={cn("font-medium hover:text-primary hover:underline focus-visible:underline", className)}
    >
      {handle}
    </Link>
  );
}
