"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { env } from "@/env";
import { AuthContext, type AuthState, demoAuth } from "./auth-context";

function PrivyBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const solanaWallet = privy.user?.linkedAccounts.find(
    (a): a is Extract<typeof a, { type: "wallet" }> => a.type === "wallet" && a.chainType === "solana",
  );
  const value: AuthState = {
    configured: true,
    ready: privy.ready,
    authenticated: privy.authenticated,
    userLabel: privy.user?.google?.email ?? privy.user?.email?.address ?? null,
    walletAddress: solanaWallet?.address ?? null,
    login: () => privy.login(),
    logout: () => privy.logout(),
    getAccessToken: () => privy.getAccessToken(),
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Privy when configured; otherwise a demo context so the terminal stays browsable signed-out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <AuthContext value={demoAuth}>{children}</AuthContext>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "dark", accentColor: "#9ccbff", walletChainType: "solana-only" },
        loginMethods: ["google", "email"],
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
