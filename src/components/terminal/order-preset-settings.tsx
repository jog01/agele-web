import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fromBaseUnits, toSwapBaseUnits } from "@/lib/amounts";
import type { Side } from "./order-ticket";

type Presets = Record<Side, string[]>;

const defaults: Presets = { buy: ["10", "100", "500", "1000"], sell: ["25", "50", "75", "100"] };
export const orderPresetSlots = [0, 1, 2, 3] as const;
const sides = ["buy", "sell"] as const;
const storageKey = "agele:order-presets:v1";

function normalizePreset(side: Side, value: string) {
  const raw = value.trim();
  if (side === "buy") {
    const amount = toSwapBaseUnits(raw, 6);
    if (amount === "0") throw new Error("Enter an amount greater than zero.");
    return fromBaseUnits(amount, 6);
  }
  const percent = Number(raw);
  if (!/^\d+$/.test(raw) || percent < 1 || percent > 100)
    throw new Error("Enter a whole percent from 1 to 100.");
  return String(percent);
}

function readPresets(): Presets {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    if (
      sides.every((side) => Array.isArray(stored?.[side]) && stored[side].length === defaults[side].length)
    ) {
      return {
        buy: stored.buy.map((value: string) => normalizePreset("buy", value)),
        sell: stored.sell.map((value: string) => normalizePreset("sell", value)),
      };
    }
  } catch {}
  return defaults;
}

export function useOrderPresets() {
  const [presets, setPresets] = useState(defaults);
  useEffect(() => {
    setPresets(readPresets());
    function onChange(event: Event) {
      if (event instanceof StorageEvent && event.key !== storageKey && event.key !== null) return;
      setPresets(readPresets());
    }
    window.addEventListener(storageKey, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(storageKey, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  function save(next: Presets) {
    setPresets(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event(storageKey));
    } catch {}
  }
  return [presets, save] as const;
}

export function OrderPresetSettings({
  presets,
  instant,
  live,
  slippage,
  onSave,
}: {
  presets: Presets;
  instant: boolean;
  live: boolean;
  slippage: number;
  onSave: (presets: Presets, instant: boolean) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(presets);
  const [instantDraft, setInstantDraft] = useState(instant);
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Trade settings</DialogTitle>
        <DialogDescription>Customize the four presets on each side of the order ticket.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const next: Presets = { buy: [], sell: [] };
          const issues: Record<string, string> = {};
          for (const side of sides) {
            draft[side].forEach((value, index) => {
              try {
                next[side].push(normalizePreset(side, value));
              } catch (error) {
                issues[`${side}-${index}`] = error instanceof Error ? error.message : "Enter a valid preset.";
              }
            });
          }
          setErrors(issues);
          if (Object.keys(issues).length === 0) onSave(next, instantDraft);
        }}
      >
        {sides.map((side) => (
          <fieldset key={side} className="min-w-0">
            <legend className="mb-1.5 font-medium text-xs">
              {side === "buy" ? "Buy amounts (USDC)" : "Sell amounts (% of balance)"}
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {orderPresetSlots.map((index) => {
                const slot = `${side}-${index}`;
                const label = `${side === "buy" ? "Buy" : "Sell"} preset ${index + 1}`;
                return (
                  <Input
                    key={slot}
                    aria-label={label}
                    aria-invalid={!!errors[slot]}
                    aria-describedby={errors[slot] ? `${id}-${side}-error` : undefined}
                    inputMode={side === "buy" ? "decimal" : "numeric"}
                    value={draft[side][index]}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        [side]: draft[side].map((p, i) => (i === index ? event.target.value : p)),
                      });
                      if (errors[slot]) setErrors({ ...errors, [slot]: "" });
                    }}
                    className="h-8 px-2 font-mono"
                  />
                );
              })}
            </div>
            {draft[side].some((_, index) => errors[`${side}-${index}`]) && (
              <p id={`${id}-${side}-error`} role="alert" className="mt-1 text-warning text-xs">
                {orderPresetSlots.map((index) => {
                  const error = errors[`${side}-${index}`];
                  return error ? (
                    <span className="block" key={`${side}-${index}`}>
                      Preset {index + 1}: {error}
                    </span>
                  ) : null;
                })}
              </p>
            )}
          </fieldset>
        ))}
        <div className="border-t pt-3">
          <label className="flex w-fit items-center gap-2 font-medium text-xs">
            <input
              type="checkbox"
              checked={instantDraft}
              onChange={(event) => setInstantDraft(event.target.checked)}
              aria-describedby={`${id}-instant-info`}
              className="size-4 accent-primary"
            />
            Instant buy
          </label>
          <p id={`${id}-instant-info`} className="mt-1 text-muted-foreground text-xs">
            {live
              ? "Buy presets skip quote review and go straight to wallet signing on this ticket."
              : "Buy presets open a preview while trading is unavailable. Nothing is submitted."}
          </p>
          <p className="mt-2 text-muted-foreground text-xs">Default quote slippage: {slippage}%.</p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(defaults);
              setErrors({});
            }}
          >
            Reset amounts
          </Button>
          <Button type="submit" size="sm">
            Save settings
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
