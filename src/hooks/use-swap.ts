"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { fromBaseUnits, toBaseUnits } from "@/lib/amounts";
import { ApiError, type Token } from "@/lib/api/client";
import { pendingSwaps } from "@/lib/pending-swaps";
import { solanaCluster } from "@/lib/solana/cluster";
import {
  checkSwap,
  executeSwap,
  type SwapInput,
  type SwapIssued,
  type SwapPhase,
  swapApi,
  swapErrorMessage,
} from "@/lib/swaps";

export function useSwap(token: Token | undefined, side: "buy" | "sell", raw: string, price: number | null) {
  const auth = useAuth();
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [message, setMessage] = useState("");
  const [disabledByApi, setDisabledByApi] = useState(false);
  const [requote, setRequote] = useState<{ key: string; order: SwapIssued }>();
  const owner =
    auth.authenticated && auth.walletAddress
      ? `agele:pending-swap:${solanaCluster().caip2}:${auth.walletAddress}`
      : undefined;
  const tracking = useSyncExternalStore(
    pendingSwaps.subscribe,
    () => pendingSwaps.snapshot(owner),
    pendingSwaps.serverSnapshot,
  );
  const { pending, busy } = tracking;
  const autoResumed = useRef<string | undefined>(undefined);
  let input: SwapInput | undefined;
  let validation = "";
  try {
    if (token && raw) {
      const amount = toBaseUnits(raw.startsWith(".") ? `0${raw}` : raw, side === "buy" ? 6 : token.decimals);
      if (amount.length > 78) throw new Error("Amount is too large. Use at most 78 base-unit digits.");
      if (amount !== "0")
        input = {
          inputMint: side === "buy" ? solanaCluster().usdcMint : token.mint,
          outputMint: side === "buy" ? token.mint : solanaCluster().usdcMint,
          amount,
          slippageBps: 50,
        };
    }
  } catch (error) {
    validation = swapErrorMessage(error);
  }
  const key = JSON.stringify(input ?? null);
  const [debounced, setDebounced] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(key), 350);
    return () => clearTimeout(timer);
  }, [key]);
  const quoteQuery = useQuery({
    queryKey: ["swap-quote", key],
    enabled: !!input && key === debounced && !busy && !pending,
    queryFn: ({ signal }) => swapApi.quote(input!, signal),
    retry: false,
    staleTime: 10_000,
  });
  const reviewedOrder = requote?.key === key ? requote.order : undefined;
  const quote = reviewedOrder ?? quoteQuery.data;
  const tradingDisabled =
    disabledByApi || (quoteQuery.error instanceof ApiError && quoteQuery.error.code === "trading_disabled");
  const unavailable = !auth.configured
    ? "Trading is unavailable in demo. Configure sign-in to trade."
    : !auth.ready
      ? "Sign-in is loading. Trading is unavailable until ready."
      : !auth.authenticated
        ? "Trading needs sign-in. Confirm to sign in."
        : !auth.signSwap
          ? "Trading is unavailable until your embedded wallet is ready."
          : "";
  const outputDecimals = side === "buy" ? (token?.decimals ?? 0) : 6;
  const receive = quote ? fromBaseUnits(quote.outAmount, outputDecimals) : undefined;
  const minReceive = quote ? fromBaseUnits(quote.otherAmountThreshold, outputDecimals) : undefined;
  const confirm = useCallback(async () => {
    if (!auth.authenticated) {
      if (auth.configured && auth.ready) auth.login();
      return;
    }
    if (!owner) return;
    const resume = pendingSwaps.snapshot(owner).pending;
    if ((!auth.configured || !auth.ready || !auth.signSwap) && !resume) return;
    if ((!resume && (!input || !quote || tradingDisabled)) || !pendingSwaps.begin(owner)) return;
    const track = (next: Parameters<typeof pendingSwaps.track>[1]) => pendingSwaps.track(owner, next);
    setMessage("");
    try {
      if (!resume && !auth.signSwap) throw new Error("Embedded Solana wallet is not ready");
      const result = resume
        ? await checkSwap(resume, { ...swapApi, phase: setPhase })
        : await executeSwap(
            { input: input!, otherAmountThreshold: quote!.otherAmountThreshold, order: reviewedOrder },
            { ...swapApi, sign: auth.signSwap!, phase: setPhase, submitted: track },
          );
      if (result.status === "requote") {
        setRequote({ key, order: result.order });
        setMessage("Price moved: review the new minimum and confirm again");
        return;
      }
      setRequote(undefined);
      track(result.status === "pending-unknown" ? result : undefined);
      const url = result.signature
        ? `https://solscan.io/tx/${result.signature}${solanaCluster().explorerQuery}`
        : undefined;
      if (result.status === "confirmed") {
        setMessage("Swap confirmed");
        toast.success("Swap confirmed", {
          action: url
            ? { label: "View on Solscan", onClick: () => window.open(url, "_blank", "noopener,noreferrer") }
            : undefined,
        });
      } else if (result.status === "pending-unknown") {
        setMessage(
          "Outcome unknown: checking the existing swap. Confirm again to check status, not create another swap.",
        );
      } else if (result.status === "failed") {
        setMessage(result.error ?? "Swap failed");
      } else setMessage("Quote expired. Review a fresh quote and try again.");
    } catch (error) {
      if (pendingSwaps.snapshot(owner).pending) {
        setPhase("pending-unknown");
      } else {
        setRequote(undefined);
        setPhase("failed");
        setMessage(swapErrorMessage(error));
        if (error instanceof ApiError && error.code === "trading_disabled") setDisabledByApi(true);
      }
    } finally {
      pendingSwaps.end(owner);
    }
  }, [auth, owner, input, quote, tradingDisabled, reviewedOrder, key]);
  useEffect(() => {
    if (!owner || !auth.ready || !pending || autoResumed.current === owner) return;
    autoResumed.current = owner;
    void confirm();
  }, [owner, auth.ready, pending, confirm]);
  return {
    validAmount: !!input,
    validation,
    inputAmount: input ? fromBaseUnits(input.amount, side === "buy" ? 6 : token!.decimals) : undefined,
    quote,
    receive,
    minReceive,
    valueUsd:
      side === "buy"
        ? Number(raw)
        : receive !== undefined
          ? Number(receive)
          : !quoteQuery.error && input && price !== null
            ? Number(raw) * price
            : null,
    confirm,
    pending: !!pending,
    explorerUrl: pending?.signature
      ? `https://solscan.io/tx/${pending.signature}${solanaCluster().explorerQuery}`
      : undefined,
    tradingDisabled,
    busy,
    confirmDisabled:
      busy ||
      !!tracking.storageError ||
      (!pending &&
        (tradingDisabled ||
          !auth.configured ||
          !auth.ready ||
          (auth.authenticated && !owner) ||
          (auth.authenticated && !auth.signSwap) ||
          (auth.authenticated && (!quote || !!quoteQuery.error || key !== debounced)))),
    status:
      tracking.storageError ??
      (pending
        ? `Outcome unknown: checking swap ${pending.requestId}. Confirm again to check status; no new swap will be created.`
        : tradingDisabled
          ? "Demo only · submission disabled"
          : busy
            ? `${phase}…`
            : message ||
              validation ||
              (quoteQuery.error ? swapErrorMessage(quoteQuery.error) : "") ||
              unavailable ||
              (auth.authenticated && !owner ? "Trading needs a wallet identity." : "")),
    fallback: !!input && !quoteQuery.error && !quote,
  };
}
