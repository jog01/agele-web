import { api, unwrap } from "./client";
import type { paths } from "./schema";

type SearchResults = paths["/v1/search"]["get"]["responses"][200]["content"]["application/json"];
export type SearchTrader = SearchResults["traders"][number];

export async function search(q: string, signal: AbortSignal): Promise<SearchResults> {
  return unwrap(await api.GET("/v1/search", { params: { query: { q } }, signal }));
}
