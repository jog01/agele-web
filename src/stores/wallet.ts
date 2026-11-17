"use client";

import { create } from "zustand";

interface WalletUiState {
  depositOpen: boolean;
  setDepositOpen: (open: boolean) => void;
}

export const useWalletUi = create<WalletUiState>()((set) => ({
  depositOpen: false,
  setDepositOpen: (depositOpen) => set({ depositOpen }),
}));

export const openDeposit = () => useWalletUi.getState().setDepositOpen(true);
