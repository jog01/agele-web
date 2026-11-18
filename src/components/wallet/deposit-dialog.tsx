"use client";

import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { CopyAddress } from "@/components/common/copy-address";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { formatUsd } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { useWalletUi } from "@/stores/wallet";

const cluster = solanaCluster();

/** USDC deposit to the user's embedded Solana wallet: address to send to, live balance, optional Privy funding. */
export function DepositDialog() {
  const open = useWalletUi((s) => s.depositOpen);
  const setOpen = useWalletUi((s) => s.setDepositOpen);
  const auth = useAuth();
  const { address, creating } = auth.wallet;
  const balance = useUsdcBalance(open ? address : null, { pollMs: 10_000 });

  const previous = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!open) previous.current = undefined;
    else if (balance.data !== undefined) {
      if (previous.current !== undefined && balance.data > previous.current) {
        toast.success("Deposit received", {
          description: `${formatUsd(balance.data - previous.current)} USDC arrived`,
        });
      }
      previous.current = balance.data;
    }
  }, [open, balance.data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit USDC</DialogTitle>
          <DialogDescription>
            Send USDC on Solana to your wallet. Network fees for trades are covered, so USDC is all you need.
          </DialogDescription>
        </DialogHeader>

        {!auth.authenticated ? (
          <p className="text-muted-foreground">Sign in to get your deposit address.</p>
        ) : !address ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            {creating && <Loader2 className="size-4 animate-spin" aria-hidden />}
            <span>{creating ? "Creating your Solana wallet…" : "You don't have a Solana wallet yet."}</span>
            {!creating && (
              <Button size="sm" className="ml-auto" onClick={auth.wallet.create}>
                Create wallet
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-background/60 p-4">
              <div className="mb-1 text-muted-foreground text-xs">
                Your Solana address{cluster.cluster === "devnet" ? " (devnet)" : ""}
              </div>
              <p className="break-all font-mono text-[13px]" data-testid="deposit-address">
                {address}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <CopyAddress address={address} label="Copy deposit address" />
                <a
                  href={cluster.explorerAddressUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                >
                  Explorer <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-warning-subtle p-4 text-warning text-xs leading-relaxed">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Only send USDC (mint {cluster.usdcMint.slice(0, 4)}…{cluster.usdcMint.slice(-4)}) on the
                Solana network. Other tokens or networks may be lost.
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="text-muted-foreground">USDC balance</span>
              <span className="tabular flex items-center gap-1.5 font-medium">
                {balance.isPending ? (
                  <span role="status" aria-label="Loading balance">
                    <Skeleton className="h-4 w-20 motion-reduce:animate-none" />
                  </span>
                ) : balance.isError ? (
                  <span className="text-muted-foreground text-xs">Unavailable (RPC error)</span>
                ) : (
                  <>
                    {(balance.data ?? 0) > 0 && <CheckCircle2 className="size-4 text-positive" aria-hidden />}
                    {formatUsd(balance.data)}
                  </>
                )}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">Checks for new funds every 10 seconds while open.</p>
          </div>
        )}

        <DialogFooter>
          {auth.wallet.addFunds && (
            <Button variant="secondary" onClick={auth.wallet.addFunds}>
              <CreditCard className="size-4" aria-hidden />
              Buy with card or exchange
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
