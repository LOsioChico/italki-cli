import { authedFetch } from "../lib/auth";
import { financeOverviewSchema, type FinanceOverview } from "../schemas/finance";
import type { Config } from "../schemas/config";

export async function getBalance(config: Config | null): Promise<FinanceOverview> {
  const res = await authedFetch("/api/v2/finance/common/overview/student", config);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return financeOverviewSchema.parse(await res.json());
}
