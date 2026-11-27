"use client";

import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { useCallback } from "react";
import { solanaCluster } from "@/lib/solana/cluster";

export function useSwapSigner(address: string | null, embedded: boolean) {
  const { signTransaction } = useSignTransaction();
  const { wallets } = useWallets();
  const wallet = embedded ? wallets.find((wallet) => wallet.address === address) : undefined;
  const sign = useCallback(
    async (transaction: string) => {
      if (!wallet) throw new Error("Embedded Solana wallet is not ready");
      const { signedTransaction } = await signTransaction({
        transaction: Uint8Array.from(atob(transaction), (c) => c.charCodeAt(0)),
        wallet,
        chain: solanaCluster().privyChain,
        options: { uiOptions: { showWalletUIs: true } },
      });
      return btoa(Array.from(signedTransaction, (byte) => String.fromCharCode(byte)).join(""));
    },
    [wallet, signTransaction],
  );
  return wallet ? sign : undefined;
}
