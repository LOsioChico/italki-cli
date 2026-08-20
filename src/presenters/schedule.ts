import type { ScheduleResult, TimeSlotResult } from "../transforms/schedule";
import { bold, dim, cyan } from "../lib/color";
import { formatDateTime, formatTimeOnly, timeUntil, formatDuration } from "../lib/time-ago";

function dayKey(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupSlotsByDay(slots: TimeSlotResult[], timezone: string): Array<{ day: string; slots: TimeSlotResult[] }> {
  return slots.reduce<Array<{ day: string; slots: TimeSlotResult[] }>>((groups, slot) => {
    const key = dayKey(slot.startTime, timezone);
    const idx = groups.findIndex((g) => g.day === key);
    if (idx === -1) {
      return [...groups, { day: key, slots: [slot] }];
    }
    return groups.map((g, i) => i === idx ? { ...g, slots: [...g.slots, slot] } : g);
  }, []);
}

function formatSlot(slot: TimeSlotResult, timezone: string): string {
  const start = formatTimeOnly(slot.startTime, timezone);
  const end = formatTimeOnly(slot.endTime, timezone);
  const rel = timeUntil(slot.startTime, timezone);
  return `    ${start} – ${end} ${dim(`(${formatDuration(slot.durationMinutes)}, ${rel})`)}`;
}

export function formatSchedule(result: ScheduleResult, timezone: string, teacherName?: string, teacherId?: number): string[] {
  const advanceHours = result.advanceBookingHours;
  const free = result.freeSlots;

  const title = teacherName
    ? `${dim(`#${teacherId}`)}  ${bold(teacherName)} — ${bold("Availability")}`
    : bold("  Availability");

  const totalLabel = result.totalFreeMinutes > 0 ? `  ${dim("|")}  ${dim("Total time:")} ${formatDuration(result.totalFreeMinutes)}` : "";

  const header: string[] = [
    title,
    dim(`  Times in ${timezone}`),
    `  ${dim("Advance booking:")} ${advanceHours}h minimum`,
    `  ${dim("Available slots:")} ${free.length}${totalLabel}  ${dim("|")}  ${dim("Booked sessions:")} ${result.bookedSlots.length}`,
    ...(result.nextAvailable ? [`  ${dim("Next available:")} ${timeUntil(result.nextAvailable, timezone)} (${formatDateTime(result.nextAvailable, timezone)})`] : []),
  ];

  const availableLines: string[] = free.length > 0
    ? [
        "", `  ${bold("Available:")}`,
        ...groupSlotsByDay(free, timezone).flatMap((group) => {
          return [
            `  ${cyan(group.day)}:`,
            ...group.slots.map((s) => formatSlot(s, timezone)),
          ];
        }),
      ]
    : [];

  const bookedLines: string[] = result.bookedSlots.length > 0
    ? [
        "", dim(`  Booked (next 5 of ${result.bookedSlots.length}):`),
        ...result.bookedSlots.slice(0, 5).map((s) => dim(`    ${formatDateTime(s.startTime, timezone)} (${formatDuration(s.durationMinutes)})`)),
      ]
    : [];

  return [...header, ...availableLines, ...bookedLines];
}
