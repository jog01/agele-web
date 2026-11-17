import { describe, expect, it } from "vitest";
import { sumUiAmounts } from "./use-usdc-balance";

const acct = (uiAmountString?: string) => ({
  account: { data: { parsed: { info: { tokenAmount: { uiAmountString } } } } },
});

describe("sumUiAmounts", () => {
  it("adds every token account and treats missing amounts as zero", () => {
    expect(sumUiAmounts([acct("12.5"), acct("0.25"), acct()])).toBe(12.75);
    expect(sumUiAmounts([])).toBe(0);
  });
});
