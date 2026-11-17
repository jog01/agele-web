import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { changeTone, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChangeText({ value, className }: { value: number | null | undefined; className?: string }) {
  const Icon = (value ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("tabular inline-flex items-center gap-0.5", changeTone(value), className)}>
      {value != null && value !== 0 && <Icon className="size-3" aria-hidden />}
      {formatPct(value)}
    </span>
  );
}
