import type { FinanceOverview } from "../schemas/finance";
import { formatPrice } from "../constants";

/** Format the balance command output (credit balance). */
export function formatBalance(balance: FinanceOverview): string[] {
  const d = balance.data;
  const lines: string[] = [
    `Available:  ${formatPrice(d.available_itc)}`,
    `Total:      ${formatPrice(d.total_itc)}`,
  ];
  if (d.session_pending_itc > 0) lines.push(`In sessions: ${formatPrice(d.session_pending_itc)}`);
  if (d.frozen_itc > 0) lines.push(`Frozen:     ${formatPrice(d.frozen_itc)}`);
  if (d.purchase_pending_itc > 0) lines.push(`Pending:    ${formatPrice(d.purchase_pending_itc)}`);
  if (d.available_coupons > 0) lines.push(`Coupons:    ${d.available_coupons}`);
  return lines;
}
