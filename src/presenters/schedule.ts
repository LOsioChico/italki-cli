import type { ScheduleResponse, TimeSlot } from "../schemas/schedule";
import { bold, dim, cyan } from "../lib/color";

function formatTime(iso: string, timezone: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeOnly(iso: string, timezone: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function slotDuration(slot: TimeSlot): string {
  const start = new Date(slot.start_time).getTime();
  const end = new Date(slot.end_time).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return hours >= 1 ? `${hours}h` : `${(end - start) / (1000 * 60)}min`;
}

function dayKey(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupSlotsByDay(slots: TimeSlot[], timezone: string): Array<{ day: string; slots: TimeSlot[] }> {
  return slots.reduce<Array<{ day: string; slots: TimeSlot[] }>>((groups, slot) => {
    const key = dayKey(slot.start_time, timezone);
    const idx = groups.findIndex((g) => g.day === key);
    if (idx === -1) {
      return [...groups, { day: key, slots: [slot] }];
    }
    return groups.map((g, i) => i === idx ? { ...g, slots: [...g.slots, slot] } : g);
  }, []);
}

function formatSlot(slot: TimeSlot, timezone: string): string {
  const start = formatTimeOnly(slot.start_time, timezone);
  const end = formatTimeOnly(slot.end_time, timezone);
  return `    ${start}–${end} (${slotDuration(slot)})`;
}

export function formatSchedule(response: ScheduleResponse, timezone: string, teacherName?: string, teacherId?: number): string[] {
  const d = response.data;
  const advanceHours = Math.floor(d.minimum_request_time_interval / 60);

  const title = teacherName
    ? `${dim(`#${teacherId}`)}  ${bold(teacherName)} — ${bold("Availability")}`
    : bold("  Availability");

  const header: string[] = [
    title,
    dim(`  Times in ${timezone}`),
    `  ${dim("Advance booking:")} ${advanceHours}h minimum`,
    `  ${dim("Available slots:")} ${d.available_schedule.length}  ${dim("|")}  ${dim("Booked sessions:")} ${d.teacher_lesson.length}`,
    ...(d.closest_available_datetime ? [`  ${dim("Next available:")} ${formatTime(d.closest_available_datetime, timezone)}`] : []),
  ];

  const availableLines: string[] = d.available_schedule.length > 0
    ? [
        "", `  ${bold("Available:")}`,
        ...groupSlotsByDay(d.available_schedule, timezone).flatMap((group) => [
          `  ${cyan(group.day)}:`,
          ...group.slots.map((s) => formatSlot(s, timezone)),
        ]),
      ]
    : [];

  const bookedLines: string[] = d.teacher_lesson.length > 0
    ? [
        "", dim(`  Booked (next 5 of ${d.teacher_lesson.length}):`),
        ...d.teacher_lesson.slice(0, 5).map((s) => dim(`    ${formatTime(s.start_time, timezone)} (${slotDuration(s)})`)),
      ]
    : [];

  return [...header, ...availableLines, ...bookedLines];
}
