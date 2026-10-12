import { API_ERROR_MESSAGES } from "../constants";

/** Build an honest error message from an API error body. Maps known text_codes to friendly messages, keeps raw body otherwise. */
export function apiErrorMessage(prefix: string, status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const err = parsed?.error;
    const key = err?.text_code ?? err?.code;
    if (key) {
      const known = API_ERROR_MESSAGES[String(key)] ?? API_ERROR_MESSAGES[String(err?.code)];
      if (known) return `${prefix} failed (${status}): ${known} (${key})`;
    }
  } catch {
    // not JSON — fall through to raw body
  }
  return `${prefix} failed (${status}): ${body}`;
}
