import type { LinkedAccountWithMetadata } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";
import { primarySolanaWallet } from "./wallets";

const wallet = (address: string, chainType: string, walletClientType: string) =>
  ({ type: "wallet", address, chainType, walletClientType }) as unknown as LinkedAccountWithMetadata;
const google = { type: "google_oauth", email: "a@b.co" } as unknown as LinkedAccountWithMetadata;

describe("primarySolanaWallet", () => {
  it("prefers the Privy embedded Solana wallet", () => {
    const accounts = [google, wallet("Ext1", "solana", "phantom"), wallet("Emb1", "solana", "privy")];
    expect(primarySolanaWallet(accounts)?.address).toBe("Emb1");
  });

  it("falls back to a linked Solana wallet and ignores other chains", () => {
    const accounts = [wallet("0xabc", "ethereum", "privy"), wallet("Ext1", "solana", "phantom")];
    expect(primarySolanaWallet(accounts)?.address).toBe("Ext1");
  });

  it("returns null without a Solana wallet", () => {
    expect(primarySolanaWallet([google, wallet("0xabc", "ethereum", "privy")])).toBeNull();
  });
});
