import { z } from "zod";

export const configSchema = z.object({
  i_token: z.string(),
  user_id: z.number(),
  nickname: z.string(),
  timezone_iana: z.string(),
  saved_at: z.string(),
});

export type Config = z.infer<typeof configSchema>;