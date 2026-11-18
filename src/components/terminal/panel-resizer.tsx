"use client";

import { type PointerEvent, useRef } from "react";
import { cn } from "@/lib/utils";

export function PanelResizer({
  label,
  controls,
  orientation = "vertical",
  value,
  min,
  max,
  onChange,
  onReset,
  reverse = false,
  className,
}: {
  label: string;
  controls: string;
  orientation?: "vertical" | "horizontal";
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onReset: () => void;
  reverse?: boolean;
  className?: string;
}) {
  const drag = useRef<{ pointer: number; origin: number; value: number } | null>(null);
  const vertical = orientation === "vertical";
  const update = (next: number) => onChange(Math.round(Math.max(min, Math.min(max, next))));
  const position = (event: PointerEvent<HTMLHRElement>) => (vertical ? event.clientX : event.clientY);
  const endDrag = (event: PointerEvent<HTMLHRElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <hr
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} pixels`}
      title={`${label} · drag or use arrow keys · double-click to reset`}
      onDoubleClick={onReset}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointer: event.pointerId, origin: position(event), value };
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointer !== event.pointerId) return;
        update(drag.current.value + (position(event) - drag.current.origin) * (reverse ? -1 : 1));
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const previous = vertical ? "ArrowLeft" : "ArrowUp";
        const next = vertical ? "ArrowRight" : "ArrowDown";
        if (![previous, next, "Home", "End", "Enter"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Enter") return onReset();
        if (event.key === "Home") return update(min);
        if (event.key === "End") return update(max);
        update(value + (event.key === next ? 1 : -1) * (reverse ? -1 : 1) * (event.shiftKey ? 40 : 10));
      }}
      className={cn(
        "group relative z-10 m-0 shrink-0 touch-none select-none border-0 outline-none",
        "after:absolute after:rounded-full after:bg-border after:transition-colors hover:after:bg-primary focus-visible:after:bg-primary",
        vertical
          ? "w-1.5 cursor-col-resize after:inset-y-1/3 after:left-0.5 after:w-0.5"
          : "h-1.5 cursor-row-resize after:inset-x-[45%] after:top-0.5 after:h-0.5",
        className,
      )}
    />
  );
}
