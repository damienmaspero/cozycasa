// Pure CORS header builder, extracted so it can be unit-tested without
// instantiating `better-auth`. The `after` hook in `src/auth.ts` wires this
// to the live request context.
//
// Returns the headers to set on the response, or `null` if no CORS headers
// should be set (no Origin header, or origin is not trusted).

export interface BuildCorsHeadersInput {
  origin: string | null;
  isTrusted: boolean;
  requestedHeaders: string | null;
}

export function buildCorsHeaders(
  input: BuildCorsHeadersInput,
): Record<string, string> | null {
  const { origin, isTrusted, requestedHeaders } = input;
  if (!origin) return null;
  if (!isTrusted) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    // Echo the requested headers so we don't have to enumerate every header
    // any current or future better-auth plugin might rely on.
    "Access-Control-Allow-Headers":
      requestedHeaders ?? "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
