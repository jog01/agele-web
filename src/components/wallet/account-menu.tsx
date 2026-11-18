"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Copy, KeyRound, Loader2, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { userQueries } from "@/lib/api/queries";
import { formatUsd, shortAddress } from "@/lib/format";
import { openDeposit } from "@/stores/wallet";

/** Top-bar sign-in button, or the signed-in account and wallet menu. */
export function AccountMenu() {
  const auth = useAuth();
  const { wallet } = auth;
  const me = useQuery({ ...userQueries.me(), enabled: auth.authenticated });
  const balance = useUsdcBalance(auth.authenticated ? wallet.address : null);

  if (!auth.authenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              size="sm"
              className="h-10 px-4 font-semibold"
              disabled={!auth.configured || !auth.ready}
              onClick={auth.login}
            >
              {auth.configured && !auth.ready && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Sign in
            </Button>
          </span>
        </TooltipTrigger>
        {!auth.configured && <TooltipContent>Sign-in is unavailable in this demo.</TooltipContent>}
      </Tooltip>
    );
  }

  const label = me.data?.handle ? `@${me.data.handle}` : auth.userLabel;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2 px-3" aria-label="Account and wallet">
          {wallet.creating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Wallet className="size-4" aria-hidden />
          )}
          <span className="font-mono text-xs">
            {wallet.address ? shortAddress(wallet.address) : wallet.creating ? "Creating…" : "No wallet"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-2 [&_[data-slot=dropdown-menu-item]]:min-h-10 [&_[data-slot=dropdown-menu-item]]:px-3"
      >
        <DropdownMenuLabel className="space-y-0.5">
          {label && <div className="truncate font-medium">{label}</div>}
          {wallet.address && (
            <div className="tabular font-normal text-muted-foreground text-xs">
              {balance.data === undefined ? "USDC balance —" : `${formatUsd(balance.data)} USDC`}
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {wallet.address ? (
          <>
            <DropdownMenuItem onSelect={openDeposit}>
              <ArrowDownToLine aria-hidden />
              Deposit USDC
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await navigator.clipboard.writeText(wallet.address as string);
                toast.success("Address copied");
              }}
            >
              <Copy aria-hidden />
              Copy address
            </DropdownMenuItem>
            {wallet.exportKey && (
              <DropdownMenuItem onSelect={wallet.exportKey}>
                <KeyRound aria-hidden />
                Export private key
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <DropdownMenuItem disabled={wallet.creating} onSelect={wallet.create}>
            <Wallet aria-hidden />
            {wallet.creating ? "Creating wallet…" : "Create Solana wallet"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => auth.logout()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
