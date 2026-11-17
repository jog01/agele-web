import { env } from "@/env";

type Cluster = "mainnet-beta" | "devnet";

const CLUSTERS = {
  "mainnet-beta": {
    privyChain: "solana:mainnet",
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    explorerQuery: "",
  },
  devnet: {
    privyChain: "solana:devnet",
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    rpcUrl: "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    explorerQuery: "?cluster=devnet",
  },
} as const;

/** `https://` RPC URL to its `wss://` subscriptions counterpart. */
export function toWsUrl(httpUrl: string) {
  return httpUrl.replace(/^http/, "ws");
}

export function solanaCluster(
  cluster: Cluster = env.NEXT_PUBLIC_SOLANA_CLUSTER,
  rpcUrl = env.NEXT_PUBLIC_SOLANA_RPC_URL,
) {
  const c = CLUSTERS[cluster];
  return {
    ...c,
    cluster,
    rpcUrl: rpcUrl ?? c.rpcUrl,
    explorerAddressUrl: (address: string) =>
      `https://explorer.solana.com/address/${address}${c.explorerQuery}`,
  };
}
