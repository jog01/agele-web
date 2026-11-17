"use client";

import { createContext, useContext } from "react";

export interface AuthState {
  /** False when no Privy app id is configured: the app runs in demo mode with sign-in disabled. */
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  userLabel: string | null;
  walletAddress: string | null;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const demoAuth: AuthState = {
  configured: false,
  ready: true,
  authenticated: false,
  userLabel: null,
  walletAddress: null,
  login: () => {},
  logout: async () => {},
  getAccessToken: async () => null,
};

export const AuthContext = createContext<AuthState>(demoAuth);

export const useAuth = () => useContext(AuthContext);
