import { z } from "zod";

export const financeOverviewSchema = z.object({
  meta: z.object({ ver: z.string() }).passthrough(),
  data: z.object({
    purchase_pending_itc: z.number(),
    session_pending_itc: z.number(),
    frozen_itc: z.number(),
    total_itc: z.number(),
    available_itc: z.number(),
    available_coupons: z.number(),
  }),
  success: z.number(),
});

export type FinanceOverview = z.infer<typeof financeOverviewSchema>;