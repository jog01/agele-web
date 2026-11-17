"use client";

import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { useCallback } from "react";
import { solanaCluster } from "@/lib/solana/cluster";

export function useSwapSigner(address: string | null, embedded: boolean) {
  const { signTransaction } = useSignTransaction();
  const { wallets } = useWallets();
  return useCallback(
    async (transaction: string) => {
      const wallet = wallets.find((w) => w.address === address);
      if (!embedded || !wallet) throw new Error("Embedded Solana wallet is not ready");
      const { signedTransaction } = await signTransaction({
        transaction: Uint8Array.from(atob(transaction), (c) => c.charCodeAt(0)),
        wallet,
        chain: solanaCluster().privyChain,
      });
      return btoa(Array.from(signedTransaction, (byte) => String.fromCharCode(byte)).join(""));
    },
    [address, embedded, wallets, signTransaction],
  );
}
