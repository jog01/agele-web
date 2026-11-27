"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { fromBaseUnits, toSwapBaseUnits } from "@/lib/amounts";
import { ApiError, type Token } from "@/lib/api/client";
import { pendingSwaps } from "@/lib/pending-swaps";
import { solanaCluster } from "@/lib/solana/cluster";
import { swapReviewValues } from "@/lib/swap-display";
import { swapHistoryKey } from "@/lib/swap-history";
import {
  checkSwap,
  executeSwap,
  type PendingSwap,
  type ReviewedSwap,
  type SwapInput,
  type SwapIssued,
  type SwapPhase,
  swapApi,
  swapErrorMessage,
} from "@/lib/swaps";

type SwapIntent =
  | { pending: PendingSwap }
  | { review: ReviewedSwap }
  | { instant: SwapInput; signal: AbortSignal };

function swapInput(token: Token | undefined, side: "buy" | "sell", raw: string): SwapInput | undefined {
  if (!token || !raw) return;
  const amount = toSwapBaseUnits(raw, side === "buy" ? 6 : token.decimals);
  if (amount === "0") return;
  return {
    inputMint: side === "buy" ? solanaCluster().usdcMint : token.mint,
    outputMint: side === "buy" ? token.mint : solanaCluster().usdcMint,
    amount,
    slippageBps: 50,
  };
}

export function useSwap(token: Token | undefined, side: "buy" | "sell", raw: string, price: number | null) {
  const auth = useAuth();
  const qc = useQueryClient();
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
    input = swapInput(token, side, raw);
  } catch (error) {
    validation = swapErrorMessage(error);
  }
  const key = JSON.stringify(input ?? null);
  const [debounced, setDebounced] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(key), 350);
    return () => clearTimeout(timer);
  }, [key]);
  const reviewedOrder = requote?.key === key ? requote.order : undefined;
  const quoteQuery = useQuery({
    queryKey: ["swap-quote", key],
    enabled: !!input && key === debounced && !busy && !pending && !reviewedOrder,
    queryFn: ({ signal }) => swapApi.quote(input!, signal),
    retry: false,
    staleTime: 10_000,
  });
  const quote = reviewedOrder ?? quoteQuery.data;
  const quoteError = reviewedOrder ? null : quoteQuery.error;
  const tradingDisabled =
    disabledByApi || (quoteError instanceof ApiError && quoteError.code === "trading_disabled");
  const canSign = !!(auth.configured && auth.ready && owner && auth.signSwap);
  const instantContext = useRef<AbortController | null>(null);
  const mint = token?.mint;
  useLayoutEffect(() => {
    if (!canSign || !owner || !mint) return;
    const controller = new AbortController();
    instantContext.current = controller;
    return () => {
      controller.abort();
      instantContext.current = null;
    };
  }, [canSign, owner, mint]);
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
  const run = useCallback(
    async (intent: SwapIntent) => {
      if (!owner || !pendingSwaps.begin(owner)) return;
      const track = (next: Parameters<typeof pendingSwaps.track>[1]) => pendingSwaps.track(owner, next);
      setMessage("");
      const signal = "instant" in intent ? intent.signal : undefined;
      try {
        let result: Awaited<ReturnType<typeof executeSwap>>;
        if ("pending" in intent) {
          result = await checkSwap(intent.pending, { ...swapApi, phase: setPhase });
        } else {
          const sign = auth.signSwap;
          if (!sign) throw new Error("Embedded Solana wallet is not ready");
          let review: ReviewedSwap;
          if ("instant" in intent) {
            setPhase("quoting");
            const fresh = await swapApi.quote(intent.instant, intent.signal);
            intent.signal.throwIfAborted();
            if (BigInt(fresh.inAmount) !== BigInt(intent.instant.amount))
              throw new Error("Swap input amount changed");
            review = { input: intent.instant, otherAmountThreshold: fresh.otherAmountThreshold };
          } else {
            review = intent.review;
          }
          result = await executeSwap(review, {
            ...swapApi,
            sign: async (transaction) => {
              signal?.throwIfAborted();
              const signed = await sign(transaction);
              signal?.throwIfAborted();
              return signed;
            },
            phase: setPhase,
            submitted: track,
          });
          if (result.status === "requote") {
            if (signal?.aborted) return;
            setRequote({ key: JSON.stringify(review.input), order: result.order });
            setMessage("Price moved: review the new minimum and confirm again");
            return "requote" as const;
          }
        }
        setRequote(undefined);
        if (["confirmed", "failed", "expired"].includes(result.status))
          void qc.invalidateQueries({ queryKey: swapHistoryKey(auth) });
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
        if (signal?.aborted && !pendingSwaps.snapshot(owner).pending) {
          setPhase("idle");
        } else if (pendingSwaps.snapshot(owner).pending) {
          setPhase("pending-unknown");
        } else {
          setRequote(undefined);
          setPhase("failed");
          void qc.invalidateQueries({ queryKey: swapHistoryKey(auth) });
          setMessage(swapErrorMessage(error));
          if (error instanceof ApiError && error.code === "trading_disabled") setDisabledByApi(true);
        }
      } finally {
        pendingSwaps.end(owner);
      }
    },
    [auth, owner, qc],
  );
  const confirm = useCallback(async () => {
    if (!auth.authenticated) {
      if (auth.configured && auth.ready) auth.login();
      return;
    }
    if (!owner) return;
    const resume = pendingSwaps.snapshot(owner).pending;
    if (resume) {
      await run({ pending: resume });
    } else if (canSign && input && quote && !tradingDisabled && !quoteError && key === debounced) {
      await run({
        review: { input, otherAmountThreshold: quote.otherAmountThreshold, order: reviewedOrder },
      });
    }
  }, [auth, owner, run, canSign, input, quote, tradingDisabled, quoteError, key, debounced, reviewedOrder]);
  async function instantBuy(amount: string) {
    const signal = instantContext.current?.signal;
    if (
      side !== "buy" ||
      !canSign ||
      !owner ||
      !signal ||
      tradingDisabled ||
      pendingSwaps.snapshot(owner).pending
    )
      return;
    let intent: SwapInput | undefined;
    try {
      intent = swapInput(token, "buy", amount);
    } catch (error) {
      setMessage(swapErrorMessage(error));
      return;
    }
    if (!intent) return;
    if (requote?.key === JSON.stringify(intent)) return "requote";
    return run({ instant: intent, signal });
  }
  useEffect(() => {
    if (!owner || !auth.ready || !pending || autoResumed.current === owner) return;
    autoResumed.current = owner;
    void confirm();
  }, [owner, auth.ready, pending, confirm]);
  return {
    availabilityMessage: unavailable,
    validAmount: !!input,
    validation,
    inputAmount: input ? fromBaseUnits(input.amount, side === "buy" ? 6 : token!.decimals) : undefined,
    quote,
    reviewValues: swapReviewValues(quote),
    receive,
    minReceive,
    valueUsd:
      side === "buy"
        ? Number(raw)
        : receive !== undefined
          ? Number(receive)
          : !quoteError && input && price !== null
            ? Number(raw) * price
            : null,
    confirm,
    instantBuy,
    instantBuyAvailable: canSign && !tradingDisabled,
    instantBuyBlocked: busy || !!pending || !!tracking.storageError,
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
          (auth.authenticated && (!quote || !!quoteError || key !== debounced)))),
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
              (quoteError ? swapErrorMessage(quoteError) : "") ||
              unavailable ||
              (auth.authenticated && !owner ? "Trading needs a wallet identity." : "")),
    fallback: !!input && !quoteError && !quote,
  };
}
