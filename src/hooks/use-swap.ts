"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { fromBaseUnits, toBaseUnits } from "@/lib/amounts";
import { ApiError, type Token } from "@/lib/api/client";
import type { SwapInput } from "@/lib/api/schema";
import { solanaCluster } from "@/lib/solana/cluster";
import { executeSwap, type SwapPhase, swapApi, swapErrorMessage } from "@/lib/swaps";

export function useSwap(token: Token | undefined, side: "buy" | "sell", raw: string, price: number | null) {
  const auth = useAuth();
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [message, setMessage] = useState("");
  const [disabledByApi, setDisabledByApi] = useState(false);
  const locked = useRef(false);
  let input: SwapInput | undefined;
  let validation = "";
  try {
    if (token && raw) {
      const amount = toBaseUnits(raw.startsWith(".") ? `0${raw}` : raw, side === "buy" ? 6 : token.decimals);
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
    enabled: !!input && key === debounced && !locked.current,
    queryFn: ({ signal }) => swapApi.quote(input!, signal),
    retry: false,
    staleTime: 10_000,
  });
  const quote = quoteQuery.data;
  const tradingDisabled =
    disabledByApi || (quoteQuery.error instanceof ApiError && quoteQuery.error.code === "trading_disabled");
  const busy = ["creating", "signing", "submitting", "confirming"].includes(phase);
  const outputDecimals = side === "buy" ? (token?.decimals ?? 0) : 6;
  const receive = quote ? fromBaseUnits(quote.outAmount, outputDecimals) : undefined;
  const minReceive = quote ? fromBaseUnits(quote.otherAmountThreshold, outputDecimals) : undefined;
  const confirm = async () => {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    if (!input || !quote || locked.current || tradingDisabled) return;
    locked.current = true;
    setMessage("");
    try {
      if (!auth.signSwap) throw new Error("Embedded Solana wallet is not ready");
      const result = await executeSwap(input, { ...swapApi, sign: auth.signSwap, phase: setPhase });
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
      } else if (result.status === "submitted") {
        setPhase("idle");
        setMessage(
          `Still pending. Check explorer${url ? `: ${url}` : ` for request ${result.requestId}`} before retrying.`,
        );
      } else setMessage("Quote expired. Review a fresh quote and try again.");
    } catch (error) {
      setPhase("failed");
      setMessage(swapErrorMessage(error));
      if (error instanceof ApiError && error.code === "trading_disabled") setDisabledByApi(true);
    } finally {
      locked.current = false;
    }
  };
  return {
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
    tradingDisabled,
    busy,
    confirmDisabled:
      busy || tradingDisabled || (auth.authenticated && (!quote || !!quoteQuery.error || key !== debounced)),
    status: tradingDisabled
      ? "Demo only · submission disabled"
      : busy
        ? `${phase}…`
        : message || validation || (quoteQuery.error ? swapErrorMessage(quoteQuery.error) : ""),
    fallback: !!input && !quoteQuery.error && !quote,
  };
}
