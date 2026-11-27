export function toBaseUnits(value: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Invalid decimals");
  if (!/^\d+(\.\d*)?$/.test(value)) throw new Error("Enter a valid amount");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places`);
  return BigInt(whole + fraction.padEnd(decimals, "0")).toString();
}

export function toSwapBaseUnits(value: string, decimals: number): string {
  const amount = toBaseUnits(value.startsWith(".") ? `0${value}` : value, decimals);
  if (amount.length > 78) throw new Error("Amount is too large. Use at most 78 base-unit digits.");
  return amount;
}

export function fromBaseUnits(value: string, decimals: number): string {
  if (!/^\d+$/.test(value) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255)
    throw new Error("Invalid base-unit amount");
  const digits = BigInt(value)
    .toString()
    .padStart(decimals + 1, "0");
  if (!decimals) return digits;
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return digits.slice(0, -decimals) + (fraction ? `.${fraction}` : "");
}
