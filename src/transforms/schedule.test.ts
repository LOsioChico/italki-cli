import { describe, expect, it } from "bun:test";
import { transformSchedule } from "./schedule";
import type { ScheduleResponse } from "../schemas/schedule";

describe("transformSchedule", () => {
  it("converts minimum_request_time_interval from minutes to hours", () => {
    const raw: ScheduleResponse = {
      data: {
        minimum_request_time_interval: 720,
        available_schedule: [],
        teacher_lesson: [],
        student_group_class: [],
        teacher_group_class: [],
        student_lesson: [],
        closest_available_datetime: "",
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      success: 1,
    };
    expect(transformSchedule(raw).advanceBookingHours).toBe(12);
  });

  it("subtracts booked sessions from available slots", () => {
    const raw: ScheduleResponse = {
      data: {
        minimum_request_time_interval: 0,
        available_schedule: [
          { start_time: "2026-08-18T10:00:00Z", end_time: "2026-08-18T12:00:00Z" },
        ],
        teacher_lesson: [
          { start_time: "2026-08-18T11:00:00Z", end_time: "2026-08-18T11:30:00Z" },
        ],
        student_group_class: [],
        teacher_group_class: [],
        student_lesson: [],
        closest_available_datetime: "",
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      success: 1,
    };
    const result = transformSchedule(raw);
    // 10-11 (60min) + 11:30-12 (30min) = 2 free slots
    expect(result.freeSlots.length).toBe(2);
    expect(result.totalFreeMinutes).toBe(90);
  });

  it("computes durationMinutes for each slot", () => {
    const raw: ScheduleResponse = {
      data: {
        minimum_request_time_interval: 0,
        available_schedule: [
          { start_time: "2026-08-18T10:00:00Z", end_time: "2026-08-18T11:00:00Z" },
        ],
        teacher_lesson: [],
        student_group_class: [],
        teacher_group_class: [],
        student_lesson: [],
        closest_available_datetime: "",
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      success: 1,
    };
    expect(transformSchedule(raw).freeSlots[0]!.durationMinutes).toBe(60);
  });

  it("preserves nextAvailable", () => {
    const raw: ScheduleResponse = {
      data: {
        minimum_request_time_interval: 0,
        available_schedule: [],
        teacher_lesson: [],
        student_group_class: [],
        teacher_group_class: [],
        student_lesson: [],
        closest_available_datetime: "2026-08-19T10:00:00Z",
      },
      meta: { performance: 0, server_time: 0, ver: "" },
      success: 1,
    };
    expect(transformSchedule(raw).nextAvailable).toBe("2026-08-19T10:00:00Z");
  });
});
