"use client";

import type { ComponentProps } from "react";
import { type PositionTarget, positionUrl } from "@/lib/position-replay";

export function openPosition(target: PositionTarget) {
  window.history.pushState(null, "", positionUrl(new URL(window.location.href), target));
}

export function PositionReplayLink({
  target,
  ...props
}: Omit<ComponentProps<"button">, "onClick" | "type"> & { target: PositionTarget }) {
  return <button type="button" onClick={() => openPosition(target)} {...props} />;
}
