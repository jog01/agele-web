// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { api, type Comment } from "@/lib/api/client";
import { ThesisThreadBody } from "./thesis-thread-sheet";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("pages to and focuses the thesis version linked by a notification", async () => {
  const thesis: Comment = {
    id: "root",
    kind: "thesis",
    wallet: "author",
    handle: "author",
    avatarUrl: null,
    imageUrl: null,
    mint: "mint",
    symbol: "TOK",
    source: "demo",
    position: "long",
    createdAt: 100,
    thesisId: "thesis",
    viewCount: 0,
    discussionKey: null,
    parentId: null,
    pinned: false,
    body: "Original thesis",
    likes: 0,
    replyCount: 1,
  };
  const version: Comment = { ...thesis, id: "version", body: "Linked version" };
  const firstPage = {
    id: "thesis",
    wallet: "author",
    mint: "mint",
    positionId: "position",
    viewCount: 0,
    pinned: null,
    comments: [thesis],
    nextCursor: "older",
  };
  const get = vi
    .spyOn(api, "GET")
    .mockResolvedValueOnce({ data: firstPage, response: new Response() })
    .mockResolvedValueOnce({
      data: { ...firstPage, comments: [version], nextCursor: null },
      response: new Response(),
    });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(ThesisThreadBody, {
        thread: { mint: "mint", thesisId: "thesis" },
        focusPostId: "version",
        embedded: true,
      }),
    ),
  );
  const node = await screen.findByText("Linked version");
  await waitFor(() => expect(document.activeElement).toBe(node.closest("[tabindex]")));
  expect(get).toHaveBeenNthCalledWith(
    2,
    "/v1/tokens/{mint}/theses/{thesisId}",
    expect.objectContaining({
      params: { path: { mint: "mint", thesisId: "thesis" }, query: { cursor: "older", limit: 25 } },
    }),
  );
});
