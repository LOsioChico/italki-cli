import { describe, expect, it } from "bun:test";
import { transformSchedule, expandStarts } from "./schedule";
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

describe("expandStarts", () => {
  it("expands a block with a 15-min tail: 07:00-09:15 at 60min yields 3 starts (not 08:30)", () => {
    const starts = expandStarts(
      [{ startTime: "2026-09-07T12:00:00Z", endTime: "2026-09-07T14:15:00Z", durationMinutes: 135 }],
      60,
    );
    expect(starts.map((s) => s.startTime)).toEqual([
      "2026-09-07T12:00:00.000Z",
      "2026-09-07T12:30:00.000Z",
      "2026-09-07T13:00:00.000Z",
    ]);
    expect(starts.every((s) => s.durationMinutes === 60)).toBe(true);
  });

  it("yields exactly one start for an exact-fit block", () => {
    const starts = expandStarts(
      [{ startTime: "2026-09-09T13:30:00Z", endTime: "2026-09-09T14:30:00Z", durationMinutes: 60 }],
      60,
    );
    expect(starts.length).toBe(1);
    expect(starts[0]!.startTime).toBe("2026-09-09T13:30:00.000Z");
    expect(starts[0]!.endTime).toBe("2026-09-09T14:30:00.000Z");
  });

  it("drops blocks shorter than the requested duration", () => {
    const starts = expandStarts(
      [{ startTime: "2026-09-09T13:30:00Z", endTime: "2026-09-09T14:00:00Z", durationMinutes: 30 }],
      60,
    );
    expect(starts).toEqual([]);
  });

  it("yields one start for a 30min block at 30min duration", () => {
    const starts = expandStarts(
      [{ startTime: "2026-09-09T13:30:00Z", endTime: "2026-09-09T14:00:00Z", durationMinutes: 30 }],
      30,
    );
    expect(starts.length).toBe(1);
  });

  it("expands across multiple independent blocks", () => {
    const starts = expandStarts(
      [
        { startTime: "2026-09-07T12:00:00Z", endTime: "2026-09-07T13:00:00Z", durationMinutes: 60 },
        { startTime: "2026-09-09T13:30:00Z", endTime: "2026-09-09T15:30:00Z", durationMinutes: 120 },
      ],
      60,
    );
    expect(starts.length).toBe(4); // 1 from block A + 3 from block B (13:30, 14:00, 14:30)
  });

  it("rejects durations under 30 minutes", () => {
    expect(() => expandStarts([], 15)).toThrow(/>= 30min/);
  });
});
