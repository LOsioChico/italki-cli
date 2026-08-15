import { API_BASE, API_HEADERS } from "../constants";
import type { Config } from "../schemas/config";

/** Build headers for an authenticated request. Returns null if no config/token. */
export function authHeaders(config: Config | null): Record<string, string> | null {
  if (!config?.i_token) return null;
  return {
    ...API_HEADERS,
    "X-Device": "10",
    "X-Token": config.i_token,
  };
}

/** Fetch wrapper that attaches auth headers. Throws if not logged in or session expired. */
export async function authedFetch(path: string, config: Config | null): Promise<Response> {
  const headers = authHeaders(config);
  if (!headers) {
    throw new Error("Not logged in. Run 'italki login' first.");
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  // italki returns 400 with {"error":{"code":"NeedAuth"}} for expired/invalid tokens, not 401
  if (res.status === 401 || res.status === 400) {
    const body = await res.text();
    if (body.includes("NeedAuth")) {
      throw new Error("Session expired. Run 'italki login' again.");
    }
    // Not an auth error — reconstruct so the service can handle it normally
    return new Response(body, { status: res.status, headers: res.headers });
  }
  return res;
}
