import type { ScheduleResponse, TimeSlot } from "../schemas/schedule";
import { subtractBooked } from "../lib/time-ago";

export interface TimeSlotResult {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ScheduleResult {
  advanceBookingHours: number;
  freeSlots: TimeSlotResult[];
  bookedSlots: TimeSlotResult[];
  totalFreeMinutes: number;
  nextAvailable: string | null;
}

function slotMinutes(slot: TimeSlot): number {
  return (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / (1000 * 60);
}

function toSlotResult(slot: TimeSlot): TimeSlotResult {
  return {
    startTime: slot.start_time,
    endTime: slot.end_time,
    durationMinutes: slotMinutes(slot),
  };
}

export function transformSchedule(raw: ScheduleResponse): ScheduleResult {
  const d = raw.data;
  const free = subtractBooked(d.available_schedule, d.teacher_lesson);
  const totalFreeMinutes = free.reduce((sum, s) => sum + slotMinutes(s), 0);

  return {
    advanceBookingHours: Math.floor((d.minimum_request_time_interval ?? 0) / 60),
    freeSlots: free.map(toSlotResult),
    bookedSlots: d.teacher_lesson.map(toSlotResult),
    totalFreeMinutes,
    nextAvailable: d.closest_available_datetime ?? null,
  };
}
