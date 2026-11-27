import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "./client";
import { traderPositionQuery } from "./traders";

afterEach(() => vi.restoreAllMocks());

it("fetches and caches the requested position episode separately from the latest", async () => {
  const get = vi
    .spyOn(api, "GET")
    .mockResolvedValueOnce({ data: { id: "older", fills: [] }, response: new Response() })
    .mockResolvedValueOnce({ data: { id: "latest", fills: [] }, response: new Response() });
  const client = new QueryClient();
  const query = traderPositionQuery("wallet", "mint", "older");
  await expect(client.fetchQuery(query)).resolves.toMatchObject({ id: "older" });
  await expect(client.fetchQuery(traderPositionQuery("wallet", "mint"))).resolves.toMatchObject({
    id: "latest",
  });
  expect(client.getQueryData(query.queryKey)).toMatchObject({ id: "older" });
  expect(get).toHaveBeenNthCalledWith(1, "/v1/traders/{wallet}/positions/{mint}", {
    params: { path: { wallet: "wallet", mint: "mint" }, query: { positionId: "older" } },
    signal: expect.any(AbortSignal),
  });
  expect(get).toHaveBeenNthCalledWith(2, "/v1/traders/{wallet}/positions/{mint}", {
    params: { path: { wallet: "wallet", mint: "mint" }, query: { positionId: undefined } },
    signal: expect.any(AbortSignal),
  });
});

it("surfaces a missing position without retrying or substituting another episode", async () => {
  const get = vi.spyOn(api, "GET").mockResolvedValue({
    error: { error: { message: "Position not found" } },
    response: new Response(null, { status: 404 }),
  });
  await expect(
    new QueryClient().fetchQuery(traderPositionQuery("wallet", "mint", "missing")),
  ).rejects.toMatchObject({
    status: 404,
    message: "Position not found",
  });
  expect(get).toHaveBeenCalledTimes(1);
});
