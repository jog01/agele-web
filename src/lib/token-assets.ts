import assets from "./token-assets.json";

export function getTokenAsset(mint?: string) {
  return assets.find((asset) => asset.mint === mint);
}
