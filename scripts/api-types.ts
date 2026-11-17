/**
 * Regenerates src/lib/api/schema.d.ts from the API's OpenAPI document (jog01/agele).
 * OPENAPI_URL defaults to a locally running API; point it at a deployed API or a file path instead.
 */
import { spawnSync } from "node:child_process";

const source = process.env.OPENAPI_URL ?? "http://localhost:4000/openapi.json";
const result = spawnSync("bunx", ["openapi-typescript", source, "-o", "src/lib/api/schema.d.ts"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
