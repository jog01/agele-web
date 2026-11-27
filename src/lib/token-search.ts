import { isAddress } from "@solana/kit";

export function getSearchMint(input: string) {
  const mint = input.trim();
  return isAddress(mint) ? mint : null;
}
