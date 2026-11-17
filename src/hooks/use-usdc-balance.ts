"use client";

import { address, createSolanaRpc } from "@solana/kit";
import { useQuery } from "@tanstack/react-query";
import { solanaCluster } from "@/lib/solana/cluster";

const cluster = solanaCluster();
let rpc: ReturnType<typeof createSolanaRpc> | null = null;
const getRpc = () => {
  rpc ??= createSolanaRpc(cluster.rpcUrl);
  return rpc;
};

interface ParsedTokenAccount {
  account: { data: { parsed: { info: { tokenAmount: { uiAmountString?: string } } } } };
}

/** Sums every USDC token account the owner holds (normally one ATA). */
export function sumUiAmounts(accounts: readonly ParsedTokenAccount[]) {
  return accounts.reduce(
    (sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.uiAmountString ?? 0),
    0,
  );
}

/** On-chain USDC balance of a wallet, read straight from the cluster RPC. */
export function useUsdcBalance(owner: string | null, { pollMs }: { pollMs?: number } = {}) {
  return useQuery({
    queryKey: ["wallet", owner, "usdc", cluster.cluster],
    enabled: !!owner,
    refetchInterval: pollMs ?? false,
    staleTime: 10_000,
    queryFn: async ({ signal }) => {
      const { value } = await getRpc()
        .getTokenAccountsByOwner(
          address(owner as string),
          { mint: address(cluster.usdcMint) },
          { encoding: "jsonParsed", commitment: "confirmed" },
        )
        .send({ abortSignal: signal });
      return sumUiAmounts(value as unknown as ParsedTokenAccount[]);
    },
  });
}
