import { createCipheriv } from "node:crypto";
import { z } from "zod";
import { API_BASE, API_HEADERS } from "../constants";

// See docs/api-reference.md → "Auth flow" for full details
const AES_KEY = Buffer.from("1234123412ABCDEF", "utf-8");
const AES_IV = Buffer.from("ABCDEF1234123412", "utf-8");
const SIGNATURE_TYPE = "11"; // email login
const SIGNATURE_VERSION = "001";

function computeSignature(email: string, password: string): string {
  const cipher = createCipheriv("aes-128-cbc", AES_KEY, AES_IV);
  const encrypted = Buffer.concat([cipher.update(email + password, "utf-8"), cipher.final()]);
  return SIGNATURE_TYPE + SIGNATURE_VERSION + encrypted.toString("hex").toUpperCase();
}

const loginResponseSchema = z.object({
  success: z.number(),
  data: z.object({
    i_token: z.string(),
    user: z.object({
      user_id: z.number(),
      nickname: z.string(),
      timezone_iana: z.string(),
    }),
  }).optional(),
  error: z.object({
    code: z.string(),
    msg: z.string().optional(),
  }).optional(),
});

export type LoginResult =
  | { success: true; i_token: string; user_id: number; nickname: string; timezone_iana: string }
  | { success: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  SignatureError: "Login rejected — italki may have updated their API. Check docs/api-reference.md → Auth flow.",
  DecryptError: "Login failed — device header mismatch.",
  DeviceError: "Login failed — invalid device header.",
};

export async function login(email: string, password: string): Promise<LoginResult> {
  const signature = computeSignature(email, password);
  const res = await fetch(`${API_BASE}/api/v2/loginviaemail`, {
    method: "POST",
    headers: {
      ...API_HEADERS,
      "X-Device": "10",
      "x-signature": signature,
      "X-Browser-Key": `italki-cli-${Date.now()}`,
      referer: "https://www.italki.com/en/login",
    },
    body: JSON.stringify({ email, password, ver: 1 }),
  });

  // Cloudflare blocks return HTML, not JSON
  const body = await res.text();
  if (!body.startsWith("{")) {
    return { success: false, error: `HTTP ${res.status}: blocked by Cloudflare (rate limited?). Try again later.` };
  }

  const parsed = loginResponseSchema.parse(JSON.parse(body));

  if (!parsed.success || !parsed.data) {
    const code = parsed.error?.code ?? "Unknown";
    const msg = ERROR_MESSAGES[code] ?? parsed.error?.msg ?? code;
    return { success: false, error: msg };
  }

  return {
    success: true,
    i_token: parsed.data.i_token,
    user_id: parsed.data.user.user_id,
    nickname: parsed.data.user.nickname,
    timezone_iana: parsed.data.user.timezone_iana,
  };
}
