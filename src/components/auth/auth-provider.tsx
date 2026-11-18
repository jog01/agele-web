"use client";

import { PrivyProvider, type User, useAddFunds, usePrivy } from "@privy-io/react-auth";
import { useCreateWallet, useExportWallet } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { env } from "@/env";
import { useSwapSigner } from "@/hooks/use-swap-signer";
import { setAccessTokenGetter } from "@/lib/api/client";
import { userQueries } from "@/lib/api/queries";
import { solanaCluster, toWsUrl } from "@/lib/solana/cluster";
import { AuthContext, type AuthState, demoAuth } from "./auth-context";
import { primarySolanaWallet } from "./wallets";

const cluster = solanaCluster();

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const { createWallet } = useCreateWallet();
  const { exportWallet } = useExportWallet();
  const { addFunds } = useAddFunds();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { getAccessToken, authenticated } = privy;

  const user: User | null = privy.user;
  const wallet = primarySolanaWallet(user?.linkedAccounts ?? []);
  const address = wallet?.address ?? null;
  const embedded = wallet?.walletClientType === "privy";
  const signSwap = useSwapSigner(address, embedded);

  // Set during render, not in an effect: children's queries (e.g. /v1/me) fire in effects that run before ours.
  const tokenGetter = authenticated ? getAccessToken : null;
  setAccessTokenGetter(tokenGetter);
  useEffect(() => {
    setAccessTokenGetter(tokenGetter);
    return () => setAccessTokenGetter(null);
  }, [tokenGetter]);

  // The API syncs wallets from Privy while its record has none, so refetch the profile when one appears.
  const lastAddress = useRef<string | null>(null);
  useEffect(() => {
    if (!authenticated) {
      lastAddress.current = null;
      qc.removeQueries({ queryKey: userQueries.me().queryKey });
      return;
    }
    if (address !== lastAddress.current) {
      lastAddress.current = address;
      void qc.invalidateQueries({ queryKey: userQueries.me().queryKey });
    }
  }, [authenticated, address, qc]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      await createWallet();
    } catch (err) {
      toast.error("Could not create your wallet", { description: errorMessage(err) });
    } finally {
      setCreating(false);
    }
  }, [createWallet]);

  const value = useMemo<AuthState>(
    () => ({
      configured: true,
      ready: privy.ready,
      authenticated,
      userLabel: user?.google?.email ?? user?.email?.address ?? null,
      walletAddress: address,
      wallet: {
        address,
        embedded,
        creating,
        create,
        exportKey:
          address && embedded
            ? async () => {
                try {
                  await exportWallet({ address });
                } catch (err) {
                  toast.error("Could not open key export", { description: errorMessage(err) });
                }
              }
            : null,
        addFunds: address
          ? async () => {
              try {
                await addFunds({
                  destination: { address, chain: cluster.caip2, asset: cluster.usdcMint },
                  fiat: { source: { defaultAsset: "usd" } },
                });
              } catch (err) {
                // Rejects when the user closes the flow; only surface real failures.
                const message = errorMessage(err);
                if (!/exit|clos|cancel/i.test(message))
                  toast.error("Funding unavailable", { description: message });
              }
            }
          : null,
      },
      login: () => privy.login(),
      logout: () => privy.logout(),
      getAccessToken,
      signSwap,
    }),
    [
      privy,
      authenticated,
      user,
      address,
      embedded,
      creating,
      create,
      exportWallet,
      addFunds,
      getAccessToken,
      signSwap,
    ],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Privy when configured; otherwise a demo context so the terminal stays browsable signed-out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [accentColor, setAccentColor] = useState<`#${string}`>("#B8DCA5");
  useEffect(() => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--chart-brand").trim();
    if (/^#[0-9a-f]{6}$/i.test(primary)) setAccentColor(primary as `#${string}`);
  }, []);
  const solanaRpcs = useMemo(
    () => ({
      [cluster.privyChain]: {
        rpc: createSolanaRpc(cluster.rpcUrl),
        rpcSubscriptions: createSolanaRpcSubscriptions(toWsUrl(cluster.rpcUrl)),
        blockExplorerUrl: "https://explorer.solana.com",
      },
    }),
    [],
  );
  if (!appId) return <AuthContext value={demoAuth}>{children}</AuthContext>;
  return (
    <PrivyProvider
      appId={appId}
      clientId={env.NEXT_PUBLIC_PRIVY_CLIENT_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor,
          walletChainType: "solana-only",
          showWalletLoginFirst: false,
        },
        loginMethods: ["google", "email"],
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
          ethereum: { createOnLogin: "off" },
        },
        solana: { rpcs: solanaRpcs },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
