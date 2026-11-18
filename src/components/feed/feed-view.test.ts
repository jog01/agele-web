// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import { FeedView } from "./feed-view";

const { get, pendingBoard } = vi.hoisted(() => ({ get: vi.fn(), pendingBoard: { value: false } }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get, PUT: vi.fn(), DELETE: vi.fn() },
}));
vi.mock("@/lib/api/queries", () => ({
  useTrending: () => ({ data: [{ mint: "sol", symbol: "SOL" }] }),
  useLeaderboard: () => ({
    data: pendingBoard.value ? undefined : { entries: [], dataSource: "demo" },
    isPending: pendingBoard.value,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const post = {
  id: "first",
  kind: "thesis",
  wallet: "trader-wallet",
  handle: "Orca",
  mint: "sol",
  position: "long",
  body: "Watching Solana liquidity.",
  createdAt: 1700000000,
};
function ok(items: unknown[], nextCursor: string | null = null) {
  return { data: { items, nextCursor }, response: new Response() };
}
function deferred() {
  let resolve!: (value: ReturnType<typeof ok>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ReturnType<typeof ok>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value: demoAuth }, createElement(FeedView)),
    ),
  );
  return client;
}
afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  get.mockReset();
  pendingBoard.value = false;
});

it("shows named post and trader skeletons independently, then replaces only resolved content", async () => {
  const request = deferred();
  get.mockReturnValueOnce(request.promise);
  pendingBoard.value = true;
  renderFeed();
  expect(screen.getByRole("heading", { name: "Feed" })).toBeDefined();
  expect(screen.getByRole("status", { name: "Loading feed posts" })).toBeDefined();
  expect(screen.getByRole("status", { name: "Loading suggested traders" })).toBeDefined();
  await act(async () => request.resolve(ok([post])));
  expect(await screen.findByText(post.body)).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading feed posts" })).toBeNull();
  expect(screen.getByRole("status", { name: "Loading suggested traders" })).toBeDefined();
});

it("keeps loaded posts while a cursor page loads and appends the resolved page", async () => {
  const request = deferred();
  get.mockResolvedValueOnce(ok([post], "cursor-2")).mockReturnValueOnce(request.promise);
  renderFeed();
  await screen.findByText(post.body);
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByRole("status", { name: "Loading feed posts" })).toBeDefined();
  expect(screen.getByText(post.body)).toBeDefined();
  expect(screen.getByRole("button", { name: "Loading…" }).hasAttribute("disabled")).toBe(true);
  await act(async () => request.resolve(ok([{ ...post, id: "second", body: "Second market idea." }])));
  expect(await screen.findByText("Second market idea.")).toBeDefined();
  expect(screen.getByText(post.body)).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading feed posts" })).toBeNull();
  expect(get.mock.calls[1][1].params.query.cursor).toBe("cursor-2");
});

it("does not replace visible posts with skeletons during background refresh or refresh failure", async () => {
  const request = deferred();
  get.mockResolvedValueOnce(ok([post])).mockReturnValueOnce(request.promise);
  const client = renderFeed();
  await screen.findByText(post.body);
  act(() => {
    void client.invalidateQueries({ queryKey: ["feed"] });
  });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  expect(screen.getByText(post.body)).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading feed posts" })).toBeNull();
  await act(async () => request.reject(new Error("Network unavailable")));
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t update the feed.");
  expect(screen.getByText(post.body)).toBeDefined();
});

it("shows the signed-out Following gate without a perpetual skeleton or protected request", async () => {
  get.mockResolvedValueOnce(ok([]));
  renderFeed();
  await screen.findByText("No posts yet.");
  fireEvent.click(screen.getByText("Following"));
  expect(screen.getByText("Your people, your feed")).toBeDefined();
  expect(
    screen.getByRole("button", { name: "Sign in to see your following feed" }).hasAttribute("disabled"),
  ).toBe(true);
  expect(screen.queryByRole("status", { name: "Loading feed posts" })).toBeNull();
  expect(get).toHaveBeenCalledTimes(1);
});

it("retries the failed cursor rather than refetching the already-loaded feed", async () => {
  get
    .mockResolvedValueOnce(ok([post], "cursor-2"))
    .mockRejectedValueOnce(new Error("Next page unavailable"))
    .mockResolvedValueOnce(ok([{ ...post, id: "second", body: "Recovered page." }]));
  renderFeed();
  await screen.findByText(post.body);
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t load more posts.");
  expect(screen.getByText(post.body)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Recovered page.")).toBeDefined();
  expect(get.mock.calls.map(([, options]) => options.params.query.cursor)).toEqual([
    undefined,
    "cursor-2",
    "cursor-2",
  ]);
});
