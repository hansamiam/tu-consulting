/**
 * JSON response helpers for edge functions.
 *
 * Centralises the `JSON.stringify` + `Content-Type` + CORS-header
 * spread that ~20 functions each re-implemented as a local `json()`.
 *
 * Usage:
 *   import { respondJson, respondError } from "../_shared/http.ts";
 *   return respondJson(200, { ok: true }, corsHeaders);
 *   return respondError(400, "id required", corsHeaders);
 */
export function respondJson(
  status: number,
  body: unknown,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Error response with a consistent `{ error: string }` shape. `extra`
 * merges additional fields (e.g. a machine-readable `code`).
 */
export function respondError(
  status: number,
  message: string,
  corsHeaders: Record<string, string> = {},
  extra?: Record<string, unknown>,
): Response {
  return respondJson(status, { error: message, ...extra }, corsHeaders);
}
