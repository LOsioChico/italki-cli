import type { SearchResponse, Teacher } from "../schemas/search";

export interface TeacherResult {
  id: number;
  name: string;
  type: "pro" | "tutor";
  country: string;
  isOnline: boolean;
  priceFrom: number | null;
  priceMax: number | null;
  trialPrice: number | null;
  hasTrial: boolean;
  rating: number | null;
  sessionCount: number;
  studentCount: number;
}

export interface SearchResult {
  teachers: TeacherResult[];
  paging: { page: number; pageSize: number; total: number; hasNext: boolean };
}

function toDollars(cents: number | undefined): number | null {
  return cents != null ? cents / 100 : null;
}

function transformTeacher(t: Teacher): TeacherResult {
  const u = t.user_info;
  const c = t.course_info;
  const ti = t.teacher_info;
  const ratingStr = ti?.overall_rating;
  const rating = ratingStr != null && Number(ratingStr) > 0 ? Number(ratingStr) : null;

  return {
    id: u.user_id,
    name: u.nickname,
    type: u.is_pro ? "pro" : "tutor",
    country: u.origin_country_id,
    isOnline: u.is_online === 1,
    priceFrom: toDollars(c?.min_price),
    priceMax: toDollars(c?.max_price),
    trialPrice: toDollars(c?.trial_price),
    hasTrial: c?.has_trial === 1,
    rating,
    sessionCount: ti?.session_count ?? 0,
    studentCount: ti?.student_count ?? 0,
  };
}

export function transformSearch(raw: SearchResponse): SearchResult {
  const teachers = (raw.data ?? []).map(transformTeacher);
  const p = raw.paging;
  return {
    teachers,
    paging: {
      page: p?.page ?? 1,
      pageSize: p?.page_size ?? 0,
      total: p?.total ?? 0,
      hasNext: p?.has_next === 1,
    },
  };
}
