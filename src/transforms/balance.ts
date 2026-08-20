import type { FinanceOverview } from "../schemas/finance";

export interface BalanceResult {
  available: number;
  total: number;
  inSessions: number;
  frozen: number;
  pendingPurchase: number;
  coupons: number;
}

export function transformBalance(raw: FinanceOverview): BalanceResult {
  const d = raw.data;
  return {
    available: d.available_itc / 100,
    total: d.total_itc / 100,
    inSessions: d.session_pending_itc / 100,
    frozen: d.frozen_itc / 100,
    pendingPurchase: d.purchase_pending_itc / 100,
    coupons: d.available_coupons,
  };
}
