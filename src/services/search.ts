import { API_BASE, API_HEADERS, DEFAULT_PAGE_SIZE, DEFAULT_TIMEZONE, TEACHER_TYPE_MAP, CATEGORIES, WEEKDAY_MAP } from "../constants";
import { searchResponseSchema, type SearchFilters, type SearchResponse, type Teacher } from "../schemas/search";

export interface SearchParams {
  page: number;
  page_size: number;
  user_timezone: string;
  teach_language: Record<string, unknown>;
  teacher_info?: Record<string, unknown>;
  speak_language_and?: string[];
  has_get_only_72h_data?: number;
  week_time_user?: { weekday: number[] };
}

export function buildPayload(filters: SearchFilters, page = 1): SearchParams {
  const teacherInfo: Record<string, unknown> = {};
  const teachLanguage: Record<string, unknown> = { language: filters.language };

  if (filters.teacherType) teacherInfo["teacher_type"] = TEACHER_TYPE_MAP[filters.teacherType];
  if (filters.originCountry) teacherInfo["origin_country_id"] = filters.originCountry;
  if (filters.category) teacherInfo["course_category"] = filters.category.map((slug) => CATEGORIES[slug]);
  if (filters.tags) teacherInfo["course_tags"] = filters.tags;
  if (filters.hasTrial) teacherInfo["has_trial"] = 1;
  if (filters.instant) teacherInfo["instant_lesson_status"] = 1;
  if (filters.recording) teacherInfo["recording_permission"] = 1;

  if (filters.maxPrice) teachLanguage["max_price"] = filters.maxPrice;
  if (filters.minPrice) teachLanguage["min_price"] = filters.minPrice;
  if (filters.isNative) teachLanguage["is_native"] = 1;

  const payload: SearchParams = {
    page,
    page_size: DEFAULT_PAGE_SIZE,
    user_timezone: DEFAULT_TIMEZONE,
    teach_language: teachLanguage,
  };

  if (Object.keys(teacherInfo).length > 0) payload.teacher_info = teacherInfo;
  if (filters.speaks) payload.speak_language_and = filters.speaks;
  if (filters.available72h) payload.has_get_only_72h_data = 1;
  if (filters.weekday) {
    const days = filters.weekday.map((d) => WEEKDAY_MAP[d as keyof typeof WEEKDAY_MAP]).filter((d) => d !== undefined);
    if (days.length > 0) payload.week_time_user = { weekday: days };
  }

  return payload;
}

export async function searchTeachers(filters: SearchFilters, page = 1): Promise<SearchResponse> {
  const payload = buildPayload(filters, page);
  const res = await fetch(`${API_BASE}/api/v2/teachers`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return searchResponseSchema.parse(await res.json());
}

export type SearchSort = "rating" | "price" | "sessions" | "name";

const SORT_FNS: Record<SearchSort, (a: Teacher, b: Teacher) => number> = {
  rating: (a, b) => Number(b.teacher_info?.overall_rating ?? 0) - Number(a.teacher_info?.overall_rating ?? 0),
  price: (a, b) => (a.course_info?.min_price ?? Infinity) - (b.course_info?.min_price ?? Infinity),
  sessions: (a, b) => (b.teacher_info?.session_count ?? 0) - (a.teacher_info?.session_count ?? 0),
  name: (a, b) => (a.user_info?.nickname ?? "").localeCompare(b.user_info?.nickname ?? ""),
};

/** Client-side sort (immutable) — the API's sort_by is ignored server-side. */
export function sortTeachers(result: SearchResponse, sort: SearchSort): SearchResponse {
  return { ...result, data: [...(result.data ?? [])].sort(SORT_FNS[sort]) };
}

/** Fetch all pages (API caps at page 100). Batched 50 concurrent. */
export async function searchAllTeachers(filters: SearchFilters, maxResults = Infinity): Promise<SearchResponse> {
  const first = await searchTeachers(filters, 1);
  const total = first.paging?.total ?? 0;
  const pageSize = first.paging?.page_size ?? DEFAULT_PAGE_SIZE;
  const maxPages = Math.min(Math.ceil(total / pageSize), Math.ceil(maxResults / pageSize), 100);

  const pageNums = Array.from({ length: maxPages - 1 }, (_, i) => i + 2);
  const pages: SearchResponse[] = [];
  for (let i = 0; i < pageNums.length; i += 50) {
    pages.push(...await Promise.all(pageNums.slice(i, i + 50).map((page) => searchTeachers(filters, page))));
  }

  const allData = [
    ...(first.data ?? []),
    ...pages.flatMap((p) => p.data ?? []),
  ].slice(0, maxResults);

  return {
    ...first,
    data: allData,
    paging: {
      ...first.paging,
      total: allData.length,
      has_next: 0,
    },
  };
}
