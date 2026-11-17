"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { tokenQueries } from "@/lib/api/queries";
import { formatPrice, formatUsd, shortAddress, timeAgo, utcTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

function ActivityTable({ mint }: { mint: string }) {
  const { data: trades = [], isPending } = useQuery(tokenQueries.trades(mint));
  const now = useNow();
  if (isPending) return <p className="p-4 text-muted-foreground">Loading activity…</p>;
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-card">
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Trader</TableHead>
          <TableHead className="text-right">Amount (USD)</TableHead>
          <TableHead className="text-right">Price (USD)</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((t) => (
          <TableRow key={t.signature} className="h-9">
            <TableCell>
              <span className={cn("font-medium", t.side === "buy" ? "text-positive" : "text-negative")}>
                {t.side === "buy" ? "Buy" : "Sell"}
              </span>
            </TableCell>
            <TableCell className="font-mono text-muted-foreground text-xs">
              {shortAddress(t.trader)}
            </TableCell>
            <TableCell className="tabular text-right">{formatUsd(t.amountUsd)}</TableCell>
            <TableCell className="tabular text-right">{formatPrice(t.priceUsd)}</TableCell>
            <TableCell className="tabular text-right text-muted-foreground" title={utcTimestamp(t.time)}>
              {now ? timeAgo(t.time, now) : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const MAX_THESIS = 280;

function ThesisPanel({ mint }: { mint: string }) {
  const { data: comments = [], isPending } = useQuery(tokenQueries.comments(mint));
  const auth = useAuth();
  const [draft, setDraft] = useState("");
  const now = useNow(30_000);
  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border bg-background p-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_THESIS))}
          placeholder="Share your thesis on this token"
          aria-label="Thesis"
          rows={2}
          className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between">
          <span className="tabular text-muted-foreground text-xs">
            {draft.length}/{MAX_THESIS}
          </span>
          <Button size="sm" disabled={!draft.trim() || !auth.authenticated} onClick={auth.login}>
            {auth.authenticated ? "Post" : "Sign in to post"}
          </Button>
        </div>
      </div>
      {isPending && <p className="text-muted-foreground">Loading theses…</p>}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">@{c.handle}</span>
              {c.position !== "none" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[11px]",
                    c.position === "long"
                      ? "border-positive/40 text-positive"
                      : "border-negative/40 text-negative",
                  )}
                >
                  {c.position === "long" ? "Holding" : "Exited"}
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground" title={utcTimestamp(c.createdAt)}>
                {now ? `${timeAgo(c.createdAt, now)} ago` : ""}
              </span>
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityPanel({ mint }: { mint: string }) {
  return (
    <section
      aria-label="Market activity"
      className="flex min-h-[220px] flex-1 flex-col rounded-lg border bg-card"
    >
      <Tabs defaultValue="activity" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList variant="line" className="h-10 w-full justify-start border-b px-2">
          <TabsTrigger value="activity" className="flex-none">
            Activity
          </TabsTrigger>
          <TabsTrigger value="thesis" className="flex-none gap-1.5">
            <MessageSquareText className="size-3.5" aria-hidden />
            Thesis
          </TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="min-h-0 flex-1 overflow-auto">
          <ActivityTable mint={mint} />
        </TabsContent>
        <TabsContent value="thesis" className="min-h-0 flex-1 overflow-auto">
          <ThesisPanel mint={mint} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
