"use client";

import { createContext, useContext } from "react";

export interface WalletState {
  /** Primary Solana wallet: the Privy embedded wallet when the user has one. */
  address: string | null;
  /** True for a Privy embedded wallet (exportable, signs inside Privy's iframe). */
  embedded: boolean;
  creating: boolean;
  create: () => Promise<void>;
  /** Opens Privy's key export modal; null when the wallet is not embedded. */
  exportKey: (() => Promise<void>) | null;
  /** Opens Privy's card / exchange funding flow for USDC; null when unavailable. */
  addFunds: (() => Promise<void>) | null;
}

export interface AuthState {
  /** False when no Privy app id is configured: the app runs in demo mode with sign-in disabled. */
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  userLabel: string | null;
  walletAddress: string | null;
  wallet: WalletState;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const noWallet: WalletState = {
  address: null,
  embedded: false,
  creating: false,
  create: async () => {},
  exportKey: null,
  addFunds: null,
};

export const demoAuth: AuthState = {
  configured: false,
  ready: true,
  authenticated: false,
  userLabel: null,
  walletAddress: null,
  wallet: noWallet,
  login: () => {},
  logout: async () => {},
  getAccessToken: async () => null,
};

export const AuthContext = createContext<AuthState>(demoAuth);

export const useAuth = () => useContext(AuthContext);
