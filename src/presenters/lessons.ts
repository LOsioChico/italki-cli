import type { LessonItem } from "../schemas/lesson";
import { formatPrice, formatSessionLength } from "../constants";
import { bold, dim, green, yellow } from "../lib/color";
import { formatDateTime, timeAgo, timeUntil } from "../lib/time-ago";

/** Format a list of lessons as human-readable lines (one per lesson). */
export function formatLessons(lessons: LessonItem[], timezone: string): string[] {
  if (lessons.length === 0) return ["No lessons found."];

  return lessons.map((l) => {
    const teacher = l.opposite_user_info?.nickname ?? "?";
    const start = l.session_obj?.session_start_time ?? "";
    const when = start ? formatDateTime(start, timezone) : "?";
    const rel = start ? (l.group === "completed" ? timeAgo(start) : timeUntil(start)) : "";
    const duration = formatSessionLength(l.duration);
    const price = formatPrice(l.total_price);
    const status = l.group === "completed" ? green("✓") : l.group === "upcoming" ? yellow("◯") : dim(l.group);
    const lang = l.language;

    return `${status}  ${bold(teacher)}  ${dim(`${when} (${rel})`)}  ${dim(duration)}  ${dim(price)}  ${lang}`;
  });
}
