import type { LinkedAccountWithMetadata } from "@privy-io/react-auth";

type SolanaWalletAccount = Extract<LinkedAccountWithMetadata, { type: "wallet" }> & { chainType: "solana" };

/** The user's Solana wallet for trading: the Privy embedded wallet first, else the first linked Solana wallet. */
export function primarySolanaWallet(
  accounts: readonly LinkedAccountWithMetadata[],
): SolanaWalletAccount | null {
  const solana = accounts.filter(
    (a): a is SolanaWalletAccount => a.type === "wallet" && a.chainType === "solana",
  );
  return solana.find((a) => a.walletClientType === "privy") ?? solana[0] ?? null;
}
