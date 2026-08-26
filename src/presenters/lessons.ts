import type { LessonResult } from "../transforms/lessons";
import { GROUP_MAP } from "../constants";
import { bold, dim, green, yellow, red, magenta } from "../lib/color";
import { formatDateTime, timeAgo, timeUntil, formatDuration } from "../lib/time-ago";

const GROUP_STYLE: Record<string, { icon: string; color: (s: string) => string }> = {
  completed: { icon: "✓", color: green },
  upcoming: { icon: "◯", color: yellow },
  canceled: { icon: "✗", color: red },
  action_required: { icon: "!", color: magenta },
  waiting: { icon: "…", color: yellow },
  unscheduled: { icon: "·", color: dim },
};

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
    const style = GROUP_STYLE[l.group];
    const statusIcon = style ? style.color(style.icon) : dim(`?[${l.group}]`);
    const groupLabel = GROUP_MAP[l.group] ?? `unknown:${l.group}`;
    const lang = l.language;
    const typeLabel = l.sessionTypeLabel !== l.sessionType ? dim(`(${l.sessionTypeLabel})`) : "";

    const sid = l.sessionId ? dim(`#${l.sessionId}`) : "";

    return `${statusIcon}  ${bold(teacher)}  ${dim(`${when} (${rel})`)}  ${dim(duration)}  ${dim(price)}  ${lang}  ${typeLabel}  ${dim(groupLabel)}  ${sid}`.trimEnd();
  });
}
