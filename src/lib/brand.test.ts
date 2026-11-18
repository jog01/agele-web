import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(oklch\([^)]*\)|#[\da-f]{6});/g)].map((m) => [m[1], m[2]]),
);

function linearRgb(name: string): number[] {
  const value = tokens[name];
  if (value.startsWith("#")) {
    return value
      .slice(1)
      .match(/../g)!
      .map((v) => {
        const channel = Number.parseInt(v, 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
  }
  const [L, C, h] = value.slice(6, -1).split(" ").map(Number);
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function contrast(foreground: string, background: string) {
  const luminance = (name: string) => {
    const [r, g, b] = linearRgb(name);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("Sage / Ink brand contract", () => {
  it.each([
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["accent-foreground", "accent"],
    ["muted-foreground", "card"],
    ["muted-foreground", "popover"],
    ["primary", "accent"],
    ["positive", "positive-subtle"],
    ["negative", "negative-subtle"],
    ["warning", "warning-subtle"],
    ["positive-foreground", "positive"],
    ["negative-foreground", "negative"],
  ])("keeps %s on %s above WCAG AA text contrast", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps input boundaries distinguishable from the card", () => {
    expect(contrast("input", "card")).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["chart-background", "card"],
    ["chart-text", "muted-foreground"],
    ["chart-positive", "positive"],
    ["chart-negative", "negative"],
    ["chart-brand", "primary"],
  ])("keeps the sRGB canvas alias %s aligned with %s", (canvas, ui) => {
    linearRgb(canvas).forEach((channel, index) => {
      expect(Math.abs(channel - linearRgb(ui)[index])).toBeLessThan(0.004);
    });
  });

  it("uses the same pastel green mark in the header and browser icon", () => {
    const mark = readFileSync(new URL("../../public/agele-mark.svg", import.meta.url), "utf8");
    const icon = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");
    expect(mark).toContain(tokens["chart-brand"].toUpperCase());
    const paths = [...mark.matchAll(/d="([^"]+)"/g)].map((match) => match[1]);
    for (const path of paths) expect(icon).toContain(`d="${path}"`);
  });
});
