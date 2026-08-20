import { describe, expect, it } from "bun:test";
import { transformSearch } from "./search";
import type { SearchResponse } from "../schemas/search";

describe("transformSearch", () => {
  it("converts cents to dollars", () => {
    const raw: SearchResponse = {
      data: [{
        user_info: { user_id: 1, nickname: "Test", is_tutor: 0, is_pro: 1, origin_country_id: "US" },
        course_info: { min_price: 1500, max_price: 3000, trial_price: 500, has_trial: 1 },
        teacher_info: { overall_rating: "4.5", session_count: 100, student_count: 50 },
      }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    const result = transformSearch(raw);
    expect(result.teachers[0]!.priceFrom).toBe(15);
    expect(result.teachers[0]!.priceMax).toBe(30);
    expect(result.teachers[0]!.trialPrice).toBe(5);
  });

  it("maps is_pro to type pro", () => {
    const raw: SearchResponse = {
      data: [{ user_info: { user_id: 1, nickname: "T", is_tutor: 0, is_pro: 1, origin_country_id: "US" } }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    expect(transformSearch(raw).teachers[0]!.type).toBe("pro");
  });

  it("maps is_tutor to type tutor", () => {
    const raw: SearchResponse = {
      data: [{ user_info: { user_id: 1, nickname: "T", is_tutor: 1, is_pro: 0, origin_country_id: "US" } }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    expect(transformSearch(raw).teachers[0]!.type).toBe("tutor");
  });

  it("parses rating string to number", () => {
    const raw: SearchResponse = {
      data: [{ user_info: { user_id: 1, nickname: "T", is_tutor: 0, is_pro: 1, origin_country_id: "US" }, teacher_info: { overall_rating: "4.9" } }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    expect(transformSearch(raw).teachers[0]!.rating).toBe(4.9);
  });

  it("returns null rating for zero or missing", () => {
    const raw: SearchResponse = {
      data: [{ user_info: { user_id: 1, nickname: "T", is_tutor: 0, is_pro: 1, origin_country_id: "US" }, teacher_info: { overall_rating: "0" } }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    expect(transformSearch(raw).teachers[0]!.rating).toBeNull();
  });

  it("maps has_next to hasNext boolean", () => {
    const raw: SearchResponse = {
      data: [],
      paging: { page: 1, page_size: 99, total: 100, has_next: 1 },
      success: 1,
    };
    expect(transformSearch(raw).paging.hasNext).toBe(true);
  });

  it("handles missing course_info and teacher_info", () => {
    const raw: SearchResponse = {
      data: [{ user_info: { user_id: 1, nickname: "T", is_tutor: 0, is_pro: 1, origin_country_id: "US" } }],
      paging: { page: 1, page_size: 99, total: 1, has_next: 0 },
      success: 1,
    };
    const t = transformSearch(raw).teachers[0]!;
    expect(t.priceFrom).toBeNull();
    expect(t.rating).toBeNull();
    expect(t.hasTrial).toBe(false);
    expect(t.sessionCount).toBe(0);
  });
});
