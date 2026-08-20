import type { LessonResult } from "../transforms/lessons";
import { bold, dim, green, yellow } from "../lib/color";
import { formatDateTime, timeAgo, timeUntil, formatDuration } from "../lib/time-ago";

/** Format a list of lessons as human-readable lines (one per lesson). */
export function formatLessons(lessons: LessonResult[], timezone: string): string[] {
  if (lessons.length === 0) return ["No lessons found."];

  return lessons.map((l) => {
    const teacher = l.teacherName || "?";
    const start = l.sessionStart;
    const when = start ? formatDateTime(start, timezone) : "?";
    const rel = start ? (l.group === "completed" ? timeAgo(start, timezone) : timeUntil(start, timezone)) : "";
    const duration = formatDuration(l.durationMinutes);
    const price = `$${l.totalPrice.toFixed(2)}`;
    const status = l.group === "completed" ? green("✓") : l.group === "upcoming" ? yellow("◯") : dim(l.group);
    const lang = l.language;

    return `${status}  ${bold(teacher)}  ${dim(`${when} (${rel})`)}  ${dim(duration)}  ${dim(price)}  ${lang}`;
  });
}
