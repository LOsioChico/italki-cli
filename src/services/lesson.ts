import { authedFetch } from "../lib/auth";
import { lessonsResponseSchema, type LessonsResponse } from "../schemas/lesson";
import type { Config } from "../schemas/config";

export async function getLessons(config: Config | null, page = 1, pageSize = 50): Promise<LessonsResponse> {
  const res = await authedFetch(`/api/v2/united_lessons?page=${page}&page_size=${pageSize}`, config);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return lessonsResponseSchema.parse(await res.json());
}

/** Fetch all lessons across pages (page_size max 50). Returns hitCap=true if the 1000-lesson safety cap was reached. */
export async function getAllLessons(config: Config | null): Promise<{ data: LessonsResponse["data"]; hitCap: boolean }> {
  const all: LessonsResponse["data"] = [];
  let page = 1;
  let lastPageFull = false;
  // Safety cap: 20 pages × 50 = 1000 lessons
  for (let i = 0; i < 20; i++) {
    const res = await getLessons(config, page, 50);
    all.push(...res.data);
    lastPageFull = res.data.length === 50;
    if (!lastPageFull) break;
    page++;
  }
  return { data: all, hitCap: lastPageFull };
}
