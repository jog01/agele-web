// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import type { Comment } from "@/lib/api/client";
import { ThesisPanel } from "./thesis-panel";

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get, POST: post, PUT: put, DELETE: del },
}));

const mint = "So11111111111111111111111111111111111111112";
const signedIn: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "author-wallet",
  getAccessToken: async () => "test-token",
};

const thesisComment: Comment = {
  id: "post-1",
  kind: "thesis",
  mint,
  symbol: "SOL",
  imageUrl: "https://example.com/sol.webp",
  wallet: "author-wallet",
  handle: "Author",
  avatarUrl: null,
  source: "indexed",
  position: "long",
  thesisId: "thesis-1",
  discussionKey: null,
  parentId: null,
  pinned: false,
  body: "SOL spot demand is absorbing every dip.",
  likes: 2,
  replyCount: 1,
  likedByMe: false,
  createdAt: 1700000000,
};

function ok(data: unknown) {
  return { data, response: new Response(null, { status: 200 }) };
}

const clients: QueryClient[] = [];
function renderPanel(auth: AuthState = signedIn) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value: auth }, createElement(ThesisPanel, { mint })),
    ),
  );
  return client;
}

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

function mockGets(comments: Comment[] = [thesisComment]) {
  get.mockImplementation((path: string) => {
    if (path === "/v1/tokens/{mint}/comments") return Promise.resolve(ok({ comments, nextCursor: null }));
    if (path === "/v1/tokens/{mint}")
      return Promise.resolve(ok({ mint, symbol: "SOL", name: "Solana", imageUrl: null }));
    if (path === "/v1/tokens/{mint}/theses/{thesisId}")
      return Promise.resolve(ok({ pinned: null, comments: [thesisComment], nextCursor: null }));
    return Promise.resolve(ok({}));
  });
}

it("posts a thesis to POST /v1/tokens/{mint}/theses and surfaces server errors", async () => {
  mockGets([]);
  post
    .mockResolvedValueOnce({
      error: { error: { message: "Open or recent position required" } },
      response: new Response(null, { status: 404 }),
    })
    .mockResolvedValueOnce(ok(thesisComment));

  renderPanel();
  await screen.findByText("No theses or comments on this token yet.");

  fireEvent.change(screen.getByLabelText("Thesis"), {
    target: { value: "Adding on break above VWAP." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Post thesis" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Open or recent position required");

  fireEvent.click(screen.getByRole("button", { name: "Post thesis" }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect(post).toHaveBeenLastCalledWith("/v1/tokens/{mint}/theses", {
    params: { path: { mint } },
    headers: { Authorization: "Bearer test-token" },
    body: { body: "Adding on break above VWAP.", position: "long" },
  });
});

it("switches to Comment mode and posts to POST /v1/tokens/{mint}/comments", async () => {
  mockGets([thesisComment]);
  post.mockResolvedValueOnce(ok({ ...thesisComment, id: "reply-1", kind: "comment", body: "Agreed." }));

  renderPanel();
  await screen.findByText(thesisComment.body);

  fireEvent.click(screen.getByRole("button", { name: "Comment" }));
  fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "Agreed." } });
  fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/v1/tokens/{mint}/comments", {
      params: { path: { mint } },
      headers: { Authorization: "Bearer test-token" },
      body: { body: "Agreed.", position: "none" },
    }),
  );
});

it("likes and pins an author's own thesis version", async () => {
  mockGets([thesisComment]);
  put.mockResolvedValue({ response: new Response(null, { status: 204 }) });

  renderPanel();
  await screen.findByText(thesisComment.body);

  fireEvent.click(screen.getByRole("button", { name: "Like post" }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith("/v1/posts/{id}/reaction", {
      params: { path: { id: thesisComment.id } },
      headers: { Authorization: "Bearer test-token" },
    }),
  );

  fireEvent.click(screen.getByRole("button", { name: "Pin" }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith("/v1/posts/{id}/pin", {
      params: { path: { id: thesisComment.id } },
      headers: { Authorization: "Bearer test-token" },
    }),
  );
});
