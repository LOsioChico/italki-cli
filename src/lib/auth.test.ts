import { describe, expect, it } from "bun:test";
import { authHeaders } from "./auth";
import type { Config } from "../schemas/config";

const validConfig: Config = {
  i_token: "abc123",
  user_id: 123,
  nickname: "test",
  timezone_iana: "America/Bogota",
  saved_at: "2026-01-01",
};

describe("authHeaders", () => {
  it("returns headers with X-Token when config has token", () => {
    const headers = authHeaders(validConfig);
    expect(headers).not.toBeNull();
    expect(headers?.["X-Token"]).toBe("abc123");
    expect(headers?.["X-Device"]).toBe("10");
  });

  it("returns null when config is null", () => {
    expect(authHeaders(null)).toBeNull();
  });

  it("returns null when config has no token", () => {
    const config = { timezone_iana: "America/Bogota" } as Config;
    expect(authHeaders(config)).toBeNull();
  });

  it("returns null when token is empty string", () => {
    const config = { ...validConfig, i_token: "" };
    expect(authHeaders(config)).toBeNull();
  });
});
