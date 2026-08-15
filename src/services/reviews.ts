import { API_BASE, API_HEADERS } from "../constants";
import { reviewsResponseSchema, type ReviewsResponse } from "../schemas/reviews";

export interface ReviewsParams {
  id: number;
  page?: number;
  pageSize?: number;
  language?: string;
  allowEmpty?: boolean;
}

export async function getReviews(
  id: number,
  page = 1,
  pageSize = 10,
  language?: string,
  allowEmpty = false,
): Promise<ReviewsResponse> {
  const url = new URL(`${API_BASE}/api/v2/teacher/${id}/lesson_reviews`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("need_top_total", "1");
  url.searchParams.set("allow_empty", allowEmpty ? "1" : "0");
  if (language) url.searchParams.set("language", language);

  const res = await fetch(url.toString(), { headers: API_HEADERS });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return reviewsResponseSchema.parse(await res.json());
}
