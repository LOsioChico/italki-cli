import type { ScheduleResponse, TimeSlot } from "../schemas/schedule";
import { bold, dim, cyan } from "../lib/color";
import { formatDateTime, formatTimeOnly, timeUntil, subtractBooked } from "../lib/time-ago";

function formatTime(iso: string, timezone: string): string {
  return formatDateTime(iso, timezone);
}

function slotDuration(slot: TimeSlot): string {
  const start = new Date(slot.start_time).getTime();
  const end = new Date(slot.end_time).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return hours >= 1 ? `${Math.round(hours * 10) / 10}h` : `${Math.round((end - start) / (1000 * 60))}min`;
}

function slotHours(slot: TimeSlot): number {
  return (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / (1000 * 60 * 60);
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
  const free = subtractBooked(d.available_schedule, d.teacher_lesson);

  const title = teacherName
    ? `${dim(`#${teacherId}`)}  ${bold(teacherName)} — ${bold("Availability")}`
    : bold("  Availability");

  const totalHours = free.reduce((sum, s) => sum + slotHours(s), 0);
  const totalLabel = totalHours > 0 ? `  ${dim("|")}  ${dim("Total time:")} ${totalHours % 1 === 0 ? `${totalHours}h` : `${totalHours.toFixed(1)}h`}` : "";

  const header: string[] = [
    title,
    dim(`  Times in ${timezone}`),
    `  ${dim("Advance booking:")} ${advanceHours}h minimum`,
    `  ${dim("Available slots:")} ${free.length}${totalLabel}  ${dim("|")}  ${dim("Booked sessions:")} ${d.teacher_lesson.length}`,
    ...(d.closest_available_datetime ? [`  ${dim("Next available:")} ${timeUntil(d.closest_available_datetime)} (${formatTime(d.closest_available_datetime, timezone)})`] : []),
  ];

  const availableLines: string[] = free.length > 0
    ? [
        "", `  ${bold("Available:")}`,
        ...groupSlotsByDay(free, timezone).flatMap((group) => {
          const dayHours = group.slots.reduce((sum, s) => sum + slotHours(s), 0);
          const dayLabel = dayHours % 1 === 0 ? `${dayHours}h` : `${dayHours.toFixed(1)}h`;
          return [
            `  ${cyan(group.day)} ${dim(`(${dayLabel})`)}:`,
            ...group.slots.map((s) => formatSlot(s, timezone)),
          ];
        }),
      ]
    : [];

  const bookedLines: string[] = d.teacher_lesson.length > 0
    ? [
        "", dim(`  Booked (next 5 of ${d.teacher_lesson.length}):`),
        ...d.teacher_lesson.slice(0, 5).map((s) => dim(`    ${formatTime(s.start_time, timezone)} (${slotDuration(s)})`)),
      ]
    : [];

  return [...header, ...availableLines, ...bookedLines, "", dim(`  Profile: italki teacher ${teacherId ?? "<id>"}`)];
}
