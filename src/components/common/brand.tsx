import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <Image src="/agele-mark.svg" alt="" width={32} height={32} className="size-8" />
      <span className="font-bold text-2xl leading-none tracking-[-0.06em]">{PRODUCT_NAME.toLowerCase()}</span>
    </span>
  );
}
