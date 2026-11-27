"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function traderInitials(name: string) {
  const clean = name.replace(/^@/, "").trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "TR";
}

export function TraderAvatar({
  handle,
  displayName,
  avatarUrl,
  size = "default",
  className,
}: {
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? handle} /> : null}
      <AvatarFallback className="bg-secondary font-medium text-xs text-foreground">
        {traderInitials(displayName || handle)}
      </AvatarFallback>
    </Avatar>
  );
}
