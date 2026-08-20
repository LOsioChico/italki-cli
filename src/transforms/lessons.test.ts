import { describe, expect, it } from "bun:test";
import { transformLessons } from "./lessons";
import type { LessonItem } from "../schemas/lesson";

describe("transformLessons", () => {
  it("converts total_price from cents to dollars", () => {
    const items: LessonItem[] = [{
      kind: "lesson",
      group: "completed",
      card_name: "TS665",
      status: "F",
      session_type: "1",
      total_price: 2500,
      language: "english",
      duration: 4,
      im_type: "Z",
      user_type: 1,
      operator_type: "S",
      last_operate_time: "2026-01-01T00:00:00Z",
      course_obj: { course_id: 1, course_title: "Conversation" },
      opposite_user_info: { user_id: 2, nickname: "Teacher" },
      session_obj: { session_id: 1, session_start_time: "2026-01-01T10:00:00Z", session_end_time: "2026-01-01T11:00:00Z" },
    }];
    expect(transformLessons(items)[0]!.totalPrice).toBe(25);
  });

  it("converts duration from 15-min units to minutes", () => {
    const items: LessonItem[] = [{
      kind: "lesson",
      group: "completed",
      card_name: "TS665",
      status: "F",
      session_type: "1",
      total_price: 2500,
      language: "english",
      duration: 2,
      im_type: "Z",
      user_type: 1,
      operator_type: "S",
      last_operate_time: "2026-01-01T00:00:00Z",
      course_obj: { course_id: 1, course_title: "Conversation" },
      opposite_user_info: { user_id: 2, nickname: "Teacher" },
      session_obj: { session_id: 1, session_start_time: "2026-01-01T10:00:00Z", session_end_time: "2026-01-01T10:30:00Z" },
    }];
    expect(transformLessons(items)[0]!.durationMinutes).toBe(30);
  });

  it("extracts teacher info from opposite_user_info", () => {
    const items: LessonItem[] = [{
      kind: "lesson",
      group: "upcoming",
      card_name: "TS654",
      status: "U",
      session_type: "1",
      total_price: 1500,
      language: "spanish",
      duration: 3,
      im_type: "Z",
      user_type: 1,
      operator_type: "S",
      last_operate_time: "2026-01-01T00:00:00Z",
      course_obj: { course_id: 2, course_title: "Spanish Lesson" },
      opposite_user_info: { user_id: 99, nickname: "Maria", avatar_file_name: "avatar.jpg" },
      session_obj: { session_id: 2, session_start_time: "2026-09-01T10:00:00Z", session_end_time: "2026-09-01T10:45:00Z" },
    }];
    const result = transformLessons(items)[0]!;
    expect(result.teacherId).toBe(99);
    expect(result.teacherName).toBe("Maria");
    expect(result.teacherAvatar).toBe("avatar.jpg");
  });

  it("handles empty list", () => {
    expect(transformLessons([])).toEqual([]);
  });
});
