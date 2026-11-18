import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** An absolute URL, or a same-origin path such as `/__devin/port/4000` when the API sits behind the web origin. */
const urlOrPath = (protocols: RegExp) =>
  z.union([z.url({ protocol: protocols }), z.string().regex(/^\/\S*$/)]);

export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: urlOrPath(/^https?$/).default("http://localhost:4000"),
    NEXT_PUBLIC_WS_URL: urlOrPath(/^wss?$/).default("ws://localhost:4001/ws"),
    NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1).optional(),
    /** Optional Privy client id for a specific app client (dashboard > App settings > Clients). */
    NEXT_PUBLIC_PRIVY_CLIENT_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_SOLANA_CLUSTER: z.enum(["mainnet-beta", "devnet"]).default("mainnet-beta"),
    /** Browser-safe Solana RPC (e.g. a Helius URL with a domain-restricted key). Defaults to the public cluster RPC. */
    NEXT_PUBLIC_SOLANA_RPC_URL: z.url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_PRIVY_CLIENT_ID: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  },
  emptyStringAsUndefined: true,
});
