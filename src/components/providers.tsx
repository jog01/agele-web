"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, Suspense, useState } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { PositionReplayModal } from "@/components/social/position-replay-modal";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DepositDialog } from "@/components/wallet/deposit-dialog";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Suspense fallback={null}>
            <PositionReplayModal />
          </Suspense>
          <DepositDialog />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
