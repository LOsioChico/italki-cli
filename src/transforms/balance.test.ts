import { describe, expect, it } from "bun:test";
import { transformBalance } from "./balance";
import type { FinanceOverview } from "../schemas/finance";

describe("transformBalance", () => {
  it("converts all ITC values from cents to dollars", () => {
    const raw: FinanceOverview = {
      meta: { ver: "1" },
      data: {
        purchase_pending_itc: 500,
        session_pending_itc: 1000,
        frozen_itc: 200,
        total_itc: 5000,
        available_itc: 3800,
        available_coupons: 3,
      },
      success: 1,
    };
    const result = transformBalance(raw);
    expect(result.available).toBe(38);
    expect(result.total).toBe(50);
    expect(result.inSessions).toBe(10);
    expect(result.frozen).toBe(2);
    expect(result.pendingPurchase).toBe(5);
    expect(result.coupons).toBe(3);
  });

  it("handles zero values", () => {
    const raw: FinanceOverview = {
      meta: { ver: "1" },
      data: {
        purchase_pending_itc: 0,
        session_pending_itc: 0,
        frozen_itc: 0,
        total_itc: 0,
        available_itc: 0,
        available_coupons: 0,
      },
      success: 1,
    };
    const result = transformBalance(raw);
    expect(result.available).toBe(0);
    expect(result.total).toBe(0);
  });
});
