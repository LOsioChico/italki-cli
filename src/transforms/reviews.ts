import type { ReviewsResponse, Review } from "../schemas/reviews";

export interface ReviewResult {
  userId: number;
  nickname: string;
  avatar: string | null;
  isPro: boolean;
  isTutor: boolean;
  country: string;
  lessonCount: number;
  commentId: number;
  sessionId: number;
  language: string;
  content: string;
  createdAt: string;
  isTeachersPick: boolean;
}

export interface ReviewsResult {
  reviews: ReviewResult[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  topPicks: number;
}

function transformReview(r: Review): ReviewResult {
  const u = r.user_info;
  const c = r.comment_info;
  return {
    userId: u.user_id,
    nickname: u.nickname,
    avatar: u.avatar_file_name ?? null,
    isPro: u.is_pro === 1,
    isTutor: u.is_tutor === 1,
    country: u.origin_country_id,
    lessonCount: r.lesson_count,
    commentId: c.comment_id,
    sessionId: c.session_id,
    language: c.session_language,
    content: c.content || "",
    createdAt: c.create_time,
    isTeachersPick: c.is_reviews_up,
  };
}

export function transformReviews(raw: ReviewsResponse): ReviewsResult {
  const reviews = (raw.data?.review_list ?? []).map(transformReview);
  const p = raw.paging;
  return {
    reviews,
    total: p?.total ?? 0,
    page: p?.page ?? 1,
    pageSize: p?.page_size ?? 10,
    hasNext: p?.has_next === 1,
    topPicks: raw.data?.top_total ?? 0,
  };
}
