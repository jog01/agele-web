/** Canvas cannot resolve CSS variables, so read the shared brand tokens at mount. */
export function chartPalette(element: HTMLElement) {
  const style = getComputedStyle(element);
  const token = (name: string, fallback?: string) =>
    style.getPropertyValue(name).trim() || (fallback ? style.getPropertyValue(fallback).trim() : "");
  const up = token("--chart-positive", "--positive");
  const down = token("--chart-negative", "--negative");
  return {
    bg: token("--chart-background", "--card"),
    text: token("--chart-text", "--muted-foreground"),
    grid: token("--chart-grid"),
    crosshair: token("--chart-crosshair"),
    up,
    down,
    volumeUp: `${up}40`,
    volumeDown: `${down}40`,
    font: style.fontFamily,
  };
}
