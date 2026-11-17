import Link from "next/link";
import { cn } from "@/lib/utils";

export function TraderLink({
  wallet,
  handle,
  className,
}: {
  wallet: string;
  handle: string;
  className?: string;
}) {
  return (
    <Link
      href={`/traders/${encodeURIComponent(wallet)}`}
      className={cn("font-medium hover:text-primary hover:underline focus-visible:underline", className)}
    >
      {handle}
    </Link>
  );
}
