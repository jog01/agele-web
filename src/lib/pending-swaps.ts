import type { PendingSwap } from "./swaps";

interface Snapshot {
  pending?: PendingSwap;
  busy: boolean;
  storageError?: string;
}

const empty: Snapshot = { busy: false };
const snapshots = new Map<string, Snapshot>();
const listeners = new Set<() => void>();

export const pendingSwaps = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  serverSnapshot: () => empty,
  snapshot(owner: string | undefined): Snapshot {
    if (!owner || typeof window === "undefined") return empty;
    const previous = snapshots.get(owner) ?? empty;
    let pending: PendingSwap | undefined;
    let storageError: string | undefined;
    try {
      const raw = window.sessionStorage.getItem(owner);
      if (raw !== null) {
        const value: unknown = JSON.parse(raw);
        if (
          !value ||
          typeof value !== "object" ||
          !("requestId" in value) ||
          typeof value.requestId !== "string" ||
          !value.requestId ||
          ("signature" in value && typeof value.signature !== "string")
        )
          throw new Error("Invalid pending swap");
        pending = value as PendingSwap;
      }
    } catch {
      pending = previous.pending;
      storageError = "Pending swap storage is unavailable. Trading is blocked until it can be checked.";
    }
    if (
      previous.pending?.requestId === pending?.requestId &&
      previous.pending?.signature === pending?.signature &&
      previous.storageError === storageError
    )
      return previous;
    const next = { ...previous, pending, storageError };
    snapshots.set(owner, next);
    return next;
  },
  track(owner: string, pending: PendingSwap | undefined) {
    if (pending)
      window.sessionStorage.setItem(
        owner,
        JSON.stringify({
          requestId: pending.requestId,
          ...(pending.signature ? { signature: pending.signature } : {}),
        }),
      );
    else window.sessionStorage.removeItem(owner);
    snapshots.set(owner, { ...this.snapshot(owner), pending });
    for (const listener of listeners) listener();
  },
  begin(owner: string) {
    const current = this.snapshot(owner);
    if (current.busy || current.storageError) return false;
    snapshots.set(owner, { ...current, busy: true });
    for (const listener of listeners) listener();
    return true;
  },
  end(owner: string) {
    snapshots.set(owner, { ...this.snapshot(owner), busy: false });
    for (const listener of listeners) listener();
  },
};
