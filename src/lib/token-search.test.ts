import { describe, expect, it } from "vitest";
import { getSearchMint } from "./token-search";

describe("getSearchMint", () => {
  it("trims whitespace without changing the address case", () => {
    const mint = "So11111111111111111111111111111111111111112";
    expect(getSearchMint(` \n${mint}\t`)).toBe(mint);
    expect(getSearchMint("1".repeat(32))).toBe("1".repeat(32));
  });

  it.each(["SOL", "", "1".repeat(31), "0".repeat(32), "z".repeat(44), "1".repeat(45)])(
    "rejects non-address input %j",
    (input) => {
      expect(getSearchMint(input)).toBeNull();
    },
  );
});
