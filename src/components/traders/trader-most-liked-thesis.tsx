import { Eye, Heart, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { Badge } from "@/components/ui/badge";
import type { components } from "@/lib/api/schema";

type MostLiked = NonNullable<components["schemas"]["TraderProfile"]["mostLikedThesis"]>;

export function TraderMostLikedThesis({ thesis }: { thesis: MostLiked }) {
  const { post, newerVersionCount } = thesis;
  return (
    <section aria-labelledby="most-liked-heading" className="rounded-md border bg-card px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <AssetAvatar imageUrl={post.imageUrl} className="size-5" />
        <Link
          href={`/trade/${encodeURIComponent(post.mint)}`}
          className="font-medium text-sm hover:underline"
        >
          {post.symbol}
        </Link>
        <Badge variant="secondary">Thesis</Badge>
        <h2 id="most-liked-heading">
          <Badge variant="outline">Most liked</Badge>
        </h2>
      </div>
      <p className="mt-2 line-clamp-3 text-foreground/90 text-sm leading-5">{post.body}</p>
      <p className="tabular mt-2 flex items-center gap-3 text-muted-foreground text-xs">
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
          {post.viewCount}
        </span>
        {newerVersionCount > 0 && <span>{newerVersionCount} newer</span>}
      </p>
    </section>
  );
}
