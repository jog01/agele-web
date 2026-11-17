"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSwapHistory, useSwapHistoryTokens } from "@/hooks/use-swap-history";
import { solanaCluster } from "@/lib/solana/cluster";
import { historySide, swapAmount } from "@/lib/swap-history";

export function SwapHistoryPanel({ mint }: { mint: string }) {
  const history = useSwapHistory();
  const tokens = useSwapHistoryTokens(history.items.flatMap((item) => [item.inputMint, item.outputMint]));
  if (!history.authenticated)
    return <p className="p-4 text-muted-foreground">Sign in to view your swap history.</p>;
  if (history.isPending) return <p className="p-4 text-muted-foreground">Loading your swaps…</p>;
  if (history.isError && !history.items.length)
    return (
      <div className="p-4">
        Swap history unavailable.{" "}
        <Button variant="secondary" onClick={() => void history.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <section aria-label="Your swap history">
      <p className="px-3 py-2 text-muted-foreground text-xs">
        Your swaps across all tokens. Buy / sell uses this token when present, otherwise USDC. Unconfirmed
        amounts are quoted, not proof of execution.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Side</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time (UTC)</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.items.map((item) => (
            <TableRow key={item.requestId}>
              <TableCell
                className={
                  historySide(item, mint) === "buy"
                    ? "text-positive"
                    : historySide(item, mint) === "sell"
                      ? "text-negative"
                      : ""
                }
              >
                {historySide(item, mint)}
              </TableCell>
              <TableCell className="tabular">
                {swapAmount(
                  item.inAmount,
                  item.inputMint,
                  tokens.find((token) => token.mint === item.inputMint),
                )}
              </TableCell>
              <TableCell className="tabular">
                {swapAmount(
                  item.outAmount,
                  item.outputMint,
                  tokens.find((token) => token.mint === item.outputMint),
                )}
              </TableCell>
              <TableCell>
                {item.status}
                {item.status === "failed" && item.error && (
                  <span className="block text-negative text-xs">{item.error}</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                <time dateTime={item.createdAt}>
                  {item.createdAt
                    .replace("T", " ")
                    .replace(/\.\d+Z$/, "")
                    .replace(/Z$/, "")}
                </time>
              </TableCell>
              <TableCell>
                {item.signature ? (
                  <a
                    className="underline"
                    href={`https://solscan.io/tx/${item.signature}${solanaCluster().explorerQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Solscan ↗
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!history.items.length && <p className="p-4 text-muted-foreground">No swaps yet.</p>}
      {history.isError && !!history.items.length && (
        <p role="alert" className="p-3 text-negative">
          Could not refresh history. Displaying loaded swaps.
        </p>
      )}
      {history.hasNextPage && (
        <Button
          variant="secondary"
          className="m-3"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          {history.isFetchingNextPage ? "Loading…" : "Load more swaps"}
        </Button>
      )}
    </section>
  );
}
