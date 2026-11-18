import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <Image src="/agele-mark.svg" alt="" width={32} height={32} className={compact ? "size-6" : "size-8"} />
      <span className={cn("font-bold leading-none tracking-[-0.06em]", compact ? "text-xl" : "text-2xl")}>
        {PRODUCT_NAME.toLowerCase()}
      </span>
    </span>
  );
}
