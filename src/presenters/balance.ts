import type { BalanceResult } from "../transforms/balance";

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

/** Format the balance command output (credit balance). */
export function formatBalance(balance: BalanceResult): string[] {
  const lines: string[] = [
    `Available:  ${formatPrice(balance.available)}`,
    `Total:      ${formatPrice(balance.total)}`,
  ];
  if (balance.inSessions > 0) lines.push(`In sessions: ${formatPrice(balance.inSessions)}`);
  if (balance.frozen > 0) lines.push(`Frozen:     ${formatPrice(balance.frozen)}`);
  if (balance.pendingPurchase > 0) lines.push(`Pending:    ${formatPrice(balance.pendingPurchase)}`);
  if (balance.coupons > 0) lines.push(`Coupons:    ${balance.coupons}`);
  return lines;
}
