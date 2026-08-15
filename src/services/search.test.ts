import { describe, expect, it } from "bun:test";
import { buildPayload, sortTeachers, type SearchSort } from "./search";
import type { SearchResponse, Teacher } from "../schemas/search";

describe("buildPayload", () => {
  it("builds minimal payload with just language", () => {
    const payload = buildPayload({ language: "english" });
    expect(payload.page).toBe(1);
    expect(payload.page_size).toBe(99);
    expect(payload.teach_language).toEqual({ language: "english" });
    expect(payload.teacher_info).toBeUndefined();
    expect(payload.speak_language_and).toBeUndefined();
  });

  it("maps teacherType pro to 1", () => {
    const payload = buildPayload({ language: "english", teacherType: "pro" });
    expect(payload.teacher_info).toEqual({ teacher_type: 1 });
  });

  it("maps teacherType tutor to 2", () => {
    const payload = buildPayload({ language: "english", teacherType: "tutor" });
    expect(payload.teacher_info).toEqual({ teacher_type: 2 });
  });

  it("maps category slugs to API codes", () => {
    const payload = buildPayload({ language: "english", category: ["conversation", "business"] });
    expect(payload.teacher_info?.["course_category"]).toEqual(["CA005", "CA002"]);
  });

  it("puts maxPrice and minPrice in teach_language (cents)", () => {
    const payload = buildPayload({ language: "english", maxPrice: 2000, minPrice: 500 });
    expect(payload.teach_language).toEqual({ language: "english", max_price: 2000, min_price: 500 });
  });

  it("maps weekday names to numbers", () => {
    const payload = buildPayload({ language: "english", weekday: ["mon", "tue", "wed"] });
    expect(payload.week_time_user).toEqual({ weekday: [1, 2, 3] });
  });

  it("sets flags as 1 when true", () => {
    const payload = buildPayload({
      language: "english",
      hasTrial: true,
      instant: true,
      recording: true,
      available72h: true,
      isNative: true,
    });
    expect(payload.teacher_info).toEqual({
      has_trial: 1,
      instant_lesson_status: 1,
      recording_permission: 1,
    });
    expect(payload.teach_language).toEqual({ language: "english", is_native: 1 });
    expect(payload.has_get_only_72h_data).toBe(1);
  });

  it("passes page number through", () => {
    const payload = buildPayload({ language: "english" }, 5);
    expect(payload.page).toBe(5);
  });

  it("omits teacher_info when no teacher_info filters", () => {
    const payload = buildPayload({ language: "english", maxPrice: 1000 });
    expect(payload.teacher_info).toBeUndefined();
  });
});

describe("sortTeachers", () => {
  const makeResponse = (teachers: Teacher[]): SearchResponse =>
    ({ data: teachers, paging: { page: 1, page_size: 99, total: teachers.length, has_next: 0 }, success: 1 });

  const sample: Teacher[] = [
    { user_info: { user_id: 1, nickname: "Zara", is_tutor: 0, is_pro: 1, origin_country_id: "US" }, teacher_info: { overall_rating: "4.5", session_count: 100 }, course_info: { min_price: 2000 } },
    { user_info: { user_id: 2, nickname: "Alice", is_tutor: 0, is_pro: 1, origin_country_id: "US" }, teacher_info: { overall_rating: "5.0", session_count: 50 }, course_info: { min_price: 1000 } },
    { user_info: { user_id: 3, nickname: "Bob", is_tutor: 0, is_pro: 1, origin_country_id: "US" }, teacher_info: { overall_rating: "4.0", session_count: 200 }, course_info: { min_price: 3000 } },
  ];

  it("sorts by rating descending", () => {
    const sorted = sortTeachers(makeResponse(sample), "rating" as SearchSort);
    expect(sorted.data.map((t) => t.teacher_info?.overall_rating)).toEqual(["5.0", "4.5", "4.0"]);
  });

  it("sorts by price ascending", () => {
    const sorted = sortTeachers(makeResponse(sample), "price" as SearchSort);
    expect(sorted.data.map((t) => t.course_info?.min_price)).toEqual([1000, 2000, 3000]);
  });

  it("sorts by sessions descending", () => {
    const sorted = sortTeachers(makeResponse(sample), "sessions" as SearchSort);
    expect(sorted.data.map((t) => t.teacher_info?.session_count)).toEqual([200, 100, 50]);
  });

  it("sorts by name ascending", () => {
    const sorted = sortTeachers(makeResponse(sample), "name" as SearchSort);
    expect(sorted.data.map((t) => t.user_info?.nickname)).toEqual(["Alice", "Bob", "Zara"]);
  });

  it("does not mutate original", () => {
    const original = makeResponse(sample);
    sortTeachers(original, "rating" as SearchSort);
    expect(original.data.map((t) => t.teacher_info?.overall_rating)).toEqual(["4.5", "5.0", "4.0"]);
  });
});
