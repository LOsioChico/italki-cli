import { authedFetch } from "../lib/auth";
import { foundationSchema, analyticsSchema, type Foundation, type Analytics } from "../schemas/user";
import type { Config } from "../schemas/config";

export async function getFoundation(config: Config | null): Promise<Foundation> {
  const res = await authedFetch("/api/v2/me/foundation?has_user=1&has_detail=1&has_language=1", config);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return foundationSchema.parse(await res.json());
}

export async function getAnalytics(config: Config | null): Promise<Analytics> {
  const res = await authedFetch("/api/v3/lesson/learning_analytics?language=english&all_languages=true", config);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return analyticsSchema.parse(await res.json());
}
