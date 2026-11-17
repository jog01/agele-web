import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getTokenAsset } from "./token-assets";
import assets from "./token-assets.json";

describe("mint-keyed token assets", () => {
  it("bundles all eight supported identities with source provenance", () => {
    expect(assets).toHaveLength(8);
    expect(new Set(assets.map((asset) => asset.mint)).size).toBe(8);
    for (const asset of assets) {
      expect(asset.source).toMatch(/^https:\/\/static\.datapi\.jup\.ag\/token-icons\//);
      expect(asset.file).toMatch(/^[a-z]+\.webp$/);
      expect(existsSync(resolve("public/tokens", asset.file))).toBe(true);
      expect(getTokenAsset(asset.mint)?.symbol).toBe(asset.symbol);
    }
  });
  it("does not give an unknown mint a trusted logo based on its symbol", () => {
    expect(getTokenAsset("SOL")).toBeUndefined();
    expect(getTokenAsset("unknown-mint")).toBeUndefined();
    expect(getTokenAsset()).toBeUndefined();
  });
});
