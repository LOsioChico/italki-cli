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
    i_token: z.string().optional(),
    user: z.object({
      user_id: z.number(),
      nickname: z.string(),
      timezone_iana: z.string(),
    }).optional(),
    otp_verify: z.number().optional(),
    otp_token_id: z.string().optional(),
    otp_account: z.string().optional(),
    otp_code_len: z.number().optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    msg: z.string().optional(),
  }).optional(),
});

export type LoginResult =
  | { status: "ok"; i_token: string; user_id: number; nickname: string; timezone_iana: string }
  | { status: "otp"; otp_token_id: string; otp_account: string; otp_code_len: number }
  | { status: "fail"; error: string };

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
    return { status: "fail", error: `HTTP ${res.status}: blocked by Cloudflare (rate limited?). Try again later.` };
  }

  const parsed = loginResponseSchema.parse(JSON.parse(body));
  return interpretLoginResponse(parsed);
}

export async function verifyLoginOtp(otpTokenId: string, otpCode: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/v2/loginviaotp`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ otp_code: otpCode, otp_token_id: otpTokenId }),
  });

  const body = await res.text();
  if (!body.startsWith("{")) {
    return { status: "fail", error: `HTTP ${res.status}: blocked by Cloudflare (rate limited?). Try again later.` };
  }

  const parsed = loginResponseSchema.parse(JSON.parse(body));
  return interpretLoginResponse(parsed);
}

function interpretLoginResponse(parsed: z.infer<typeof loginResponseSchema>): LoginResult {
  if (parsed.data?.otp_token_id) {
    return {
      status: "otp",
      otp_token_id: parsed.data.otp_token_id,
      otp_account: parsed.data.otp_account ?? "",
      otp_code_len: parsed.data.otp_code_len ?? 4,
    };
  }

  if (!parsed.success || !parsed.data?.i_token || !parsed.data.user) {
    const code = parsed.error?.code ?? "Unknown";
    const msg = ERROR_MESSAGES[code] ?? parsed.error?.msg ?? code;
    return { status: "fail", error: msg };
  }

  return {
    status: "ok",
    i_token: parsed.data.i_token,
    user_id: parsed.data.user.user_id,
    nickname: parsed.data.user.nickname,
    timezone_iana: parsed.data.user.timezone_iana,
  };
}
