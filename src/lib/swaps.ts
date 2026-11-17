import { ApiError, api, unwrap } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";

export type SwapInput = paths["/v1/swaps"]["post"]["requestBody"]["content"]["application/json"];
export type SwapIssued = paths["/v1/swaps"]["post"]["responses"][201]["content"]["application/json"];
export type SwapSubmission =
  paths["/v1/swaps/{requestId}/submit"]["post"]["responses"][200]["content"]["application/json"];
export type SwapStatus =
  paths["/v1/swaps/{requestId}"]["get"]["responses"][200]["content"]["application/json"];

export type SwapPhase =
  | "idle"
  | "creating"
  | "signing"
  | "submitting"
  | "confirming"
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
}

export async function executeSwap(input: SwapInput, deps: Dependencies) {
  const now = deps.now ?? Date.now;
  const wait = deps.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  deps.phase?.("creating");
  let order = await deps.create(input);
  if (order.expiresAt <= now()) {
    order = await deps.create(input);
    if (order.expiresAt <= now()) {
      deps.phase?.("expired");
      return { status: "expired" as const, requestId: order.requestId };
    }
  }
  if (!Number.isFinite(order.expiresAt)) throw new Error("Invalid swap expiry");
  deps.phase?.("signing");
  const signed = await deps.sign(order.transaction);
  if (order.expiresAt <= now()) {
    deps.phase?.("expired");
    return { status: "expired" as const, requestId: order.requestId };
  }
  deps.phase?.("submitting");
  let result: SwapSubmission | SwapStatus = await deps.submit(order.requestId, signed);
  for (let attempt = 0; result.status === "submitted" && attempt < 40; attempt++) {
    deps.phase?.("confirming");
    await wait(1500);
    const next = await deps.status(order.requestId);
    result = { ...next, signature: next.signature ?? result.signature };
  }
  if (result.status === "failed") throw new Error(result.error ?? "Swap failed");
  if (result.status === "issued")
    throw new Error("Unexpected swap status. Check your wallet before retrying.");
  if (result.status !== "submitted") deps.phase?.(result.status);
  return { ...result, requestId: order.requestId };
}
