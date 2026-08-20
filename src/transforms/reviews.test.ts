import { describe, expect, it } from "bun:test";
import { transformReviews } from "./reviews";
import type { ReviewsResponse } from "../schemas/reviews";

describe("transformReviews", () => {
  it("maps is_reviews_up to isTeachersPick", () => {
    const raw: ReviewsResponse = {
      data: {
        review_list: [{
          user_info: { user_id: 1, nickname: "S", is_tutor: 0, is_pro: 1, origin_country_id: "US" },
          comment_info: { comment_id: 1, session_id: 1, session_language: "english", content: "Great", create_time: "2026-01-01T00:00:00Z", is_reviews_up: true },
          comment_count: 1,
          has_anonymous: 0,
          lesson_count: 5,
          allow_show: 1,
        }],
        comment_total: 1,
        top_total: 1,
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      paging: { has_next: 0, total: 1, page: 1, page_size: 10 },
      success: 1,
    };
    expect(transformReviews(raw).reviews[0]!.isTeachersPick).toBe(true);
  });

  it("maps is_pro/is_tutor to booleans", () => {
    const raw: ReviewsResponse = {
      data: {
        review_list: [{
          user_info: { user_id: 1, nickname: "S", is_tutor: 1, is_pro: 0, origin_country_id: "US" },
          comment_info: { comment_id: 1, session_id: 1, session_language: "english", content: "Great", create_time: "2026-01-01T00:00:00Z", is_reviews_up: false },
          comment_count: 1,
          has_anonymous: 0,
          lesson_count: 5,
          allow_show: 1,
        }],
        comment_total: 1,
        top_total: 0,
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      paging: { has_next: 0, total: 1, page: 1, page_size: 10 },
      success: 1,
    };
    const r = transformReviews(raw).reviews[0]!;
    expect(r.isPro).toBe(false);
    expect(r.isTutor).toBe(true);
  });

  it("handles empty review list", () => {
    const raw: ReviewsResponse = {
      data: { review_list: [], comment_total: 0, top_total: 0 },
      meta: { performance: 0, server_time: 0, ver: "" },
      paging: { has_next: 0, total: 0, page: 1, page_size: 10 },
      success: 1,
    };
    expect(transformReviews(raw).reviews).toEqual([]);
  });
});
