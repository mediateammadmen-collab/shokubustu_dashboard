import "server-only";
import { parseFilters } from "./filters.js";
import { MetaApiError, MissingEnvError } from "./meta.js";

/** Runs a dashboard loader for a route handler, returning the same shape as the page. */
export async function respond(request, load) {
  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await load(filters), { headers });
  } catch (error) {
    if (error instanceof MissingEnvError) return Response.json({ error: error.message }, { status: 500, headers });
    if (error instanceof MetaApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.isRateLimit ? 429 : 502, headers });
    }
    console.error(`[api] Unexpected error: ${error?.name ?? "Error"}`);
    return Response.json({ error: "Unexpected server error" }, { status: 500, headers });
  }
}
