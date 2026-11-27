import { ArrowUpRight, Eye, Heart, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { PositionReplayLink } from "@/components/social/position-replay-link";
import type { components } from "@/lib/api/schema";

type MostLiked = NonNullable<components["schemas"]["TraderProfile"]["mostLikedThesis"]>;

export function TraderMostLikedThesis({ wallet, thesis }: { wallet: string; thesis: MostLiked }) {
  const { post, newerVersionCount } = thesis;
  return (
    <section
      aria-labelledby="most-liked-heading"
      className="rounded-md bg-card px-4 py-3.5 ring-1 ring-foreground/10 sm:px-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="most-liked-heading" className="text-muted-foreground text-xs">
          Most liked thesis
        </h2>
        <Link
          href={`/trade/${encodeURIComponent(post.mint)}`}
          className="inline-flex min-h-10 items-center gap-1.5 font-medium text-sm hover:underline focus-visible:outline-2 focus-visible:outline-foreground/50 pointer-coarse:min-h-11"
        >
          <AssetAvatar imageUrl={post.imageUrl} className="size-5" />
          {post.symbol}
        </Link>
      </div>
      <PositionReplayLink
        target={{
          wallet,
          mint: post.mint,
          positionId: thesis.positionId,
          thesisId: post.thesisId ?? undefined,
        }}
        aria-label={post.thesisId ? `Open ${post.symbol} thesis thread` : `View ${post.symbol} position`}
        className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-foreground/50"
      >
        <span className="mt-2 line-clamp-3 text-foreground/90 text-sm leading-5">{post.body}</span>
        <span className="tabular mt-2 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1">
            <Heart aria-hidden className="size-3" />
            <span className="sr-only">Likes</span>
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare aria-hidden className="size-3" />
            <span className="sr-only">Replies</span>
            {post.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye aria-hidden className="size-3" />
            <span className="sr-only">Views</span>
            {post.viewCount ?? "—"}
          </span>
          {newerVersionCount > 0 && <span>{newerVersionCount} newer</span>}
          <span className="ml-auto inline-flex items-center gap-1 text-primary">
            {post.thesisId ? "Open thread" : "View position"}
            <ArrowUpRight aria-hidden className="size-3" />
          </span>
        </span>
      </PositionReplayLink>
    </section>
  );
}
