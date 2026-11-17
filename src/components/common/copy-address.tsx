"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";

export function CopyAddress({ address, label = "Copy address" }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-muted-foreground text-xs">
      <span title={address}>{shortAddress(address)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 pointer-coarse:size-11"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            toast.error("Could not copy the address. Select it and copy manually.");
          }
        }}
      >
        {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
      </Button>
    </span>
  );
}
