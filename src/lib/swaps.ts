import { ApiError, api, unwrap } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";

export type SwapInput = paths["/v1/swaps"]["post"]["requestBody"]["content"]["application/json"];
export type SwapIssued = paths["/v1/swaps"]["post"]["responses"][201]["content"]["application/json"];
export type SwapSubmission =
  paths["/v1/swaps/{requestId}/submit"]["post"]["responses"][200]["content"]["application/json"];
export type SwapStatus =
  paths["/v1/swaps/{requestId}"]["get"]["responses"][200]["content"]["application/json"];

export interface ReviewedSwap {
  input: SwapInput;
  otherAmountThreshold: string;
  order?: SwapIssued;
}

export interface PendingSwap {
  requestId: string;
  signature?: string;
}

export type SwapPhase =
  | "idle"
  | "creating"
  | "requote"
  | "signing"
  | "submitting"
  | "confirming"
  | "pending-unknown"
  | "confirmed"
  | "failed"
  | "expired";
export const swapApi = {
  quote: async (input: SwapInput, signal?: AbortSignal) =>
    unwrap(await api.GET("/v1/swaps/quote", { params: { query: input }, signal })),
  create: async (input: SwapInput) => unwrap(await api.POST("/v1/swaps", { body: input })),
  submit: async (requestId: string, signedTransaction: string) =>
    unwrap(
      await api.POST("/v1/swaps/{requestId}/submit", {
        params: { path: { requestId } },
        body: { signedTransaction },
      }),
    ),
  status: async (requestId: string) =>
    unwrap(await api.GET("/v1/swaps/{requestId}", { params: { path: { requestId } } })),
};

export function swapErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "trading_disabled") return "Demo only · submission disabled";
    if (error.code === "swap_rejected")
      return "Swap rejected: token, slippage or price impact exceeds trading limits.";
    if (error.code === "sponsor_rejected") return "Sponsorship rejected. Please try again later.";
    if (error.status === 409) return "No linked wallet. Create or link your embedded Solana wallet first.";
  }
  return error instanceof Error ? error.message : "Swap failed. Please try again.";
}

interface Dependencies {
  create: (input: SwapInput) => Promise<SwapIssued>;
  sign: (transaction: string) => Promise<string>;
  submit: (requestId: string, signed: string) => Promise<SwapSubmission>;
  status: (requestId: string) => Promise<SwapStatus>;
  phase?: (phase: SwapPhase) => void;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  submitted?: (pending: PendingSwap | undefined) => void;
}

type TrackingDependencies = Pick<Dependencies, "status" | "phase" | "wait">;

export async function checkSwap(pending: PendingSwap, deps: TrackingDependencies, initial?: SwapSubmission) {
  const wait = deps.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let result: SwapSubmission | SwapStatus = initial ?? { status: "submitted", signature: pending.signature };
  for (
    let attempt = 0;
    !["confirmed", "failed", "expired"].includes(result.status) && attempt < 40;
    attempt++
  ) {
    deps.phase?.("confirming");
    try {
      await wait(1500);
      const next = await deps.status(pending.requestId);
      result = { ...next, signature: next.signature ?? result.signature ?? pending.signature };
    } catch {
      deps.phase?.("pending-unknown");
      return {
        status: "pending-unknown" as const,
        requestId: pending.requestId,
        signature: result.signature ?? pending.signature,
      };
    }
  }
  if (result.status === "confirmed" || result.status === "failed" || result.status === "expired") {
    deps.phase?.(result.status);
    return { ...result, status: result.status, requestId: pending.requestId };
  }
  deps.phase?.("pending-unknown");
  return {
    status: "pending-unknown" as const,
    requestId: pending.requestId,
    signature: result.signature ?? pending.signature,
  };
}

export async function executeSwap(review: ReviewedSwap, deps: Dependencies) {
  const { input } = review;
  const now = deps.now ?? Date.now;
  deps.phase?.("creating");
  let order = review.order ?? (await deps.create(input));
  if (order.expiresAt <= now()) {
    order = await deps.create(input);
    if (order.expiresAt <= now()) {
      deps.phase?.("expired");
      return { status: "expired" as const, requestId: order.requestId };
    }
  }
  if (!Number.isFinite(order.expiresAt)) throw new Error("Invalid swap expiry");
  if (!/^\d+$/.test(review.otherAmountThreshold) || !/^\d+$/.test(order.otherAmountThreshold))
    throw new Error("Invalid swap minimum");
  if (BigInt(order.inAmount) !== BigInt(input.amount)) throw new Error("Swap input amount changed");
  if (BigInt(order.otherAmountThreshold) < BigInt(review.otherAmountThreshold)) {
    deps.phase?.("requote");
    return { status: "requote" as const, requestId: order.requestId, order };
  }
  deps.phase?.("signing");
  const signed = await deps.sign(order.transaction);
  if (order.expiresAt <= now()) {
    deps.phase?.("expired");
    return { status: "expired" as const, requestId: order.requestId };
  }
  deps.phase?.("submitting");
  const pending = { requestId: order.requestId };
  deps.submitted?.(pending);
  let result: SwapSubmission;
  try {
    result = await deps.submit(order.requestId, signed);
    const submitted = { ...pending, signature: result?.signature };
    deps.submitted?.(submitted);
    return await checkSwap(submitted, deps, result);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      [
        "validation_error",
        "unauthorized",
        "forbidden",
        "wallet_not_linked",
        "swap_rejected",
        "sponsor_rejected",
        "rate_limited",
      ].includes(error.code ?? "")
    ) {
      deps.submitted?.(undefined);
      throw error;
    }
    deps.phase?.("pending-unknown");
    return checkSwap(pending, deps);
  }
}
