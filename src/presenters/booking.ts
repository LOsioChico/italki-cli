import type { TimeChangeResult, SessionActionResult, SessionHistoryResult } from "../transforms/booking";
import { dim, bold, green, red } from "../lib/color";
import { formatDateTime } from "../lib/time-ago";

/** Format reschedule slots as human-readable lines. */
export function formatTimeChangeSlots(result: TimeChangeResult, timezone: string): string[] {
  if (result.freeSlots.length === 0) return ["No free slots available for reschedule."];

  const lines: string[] = [];
  for (const slot of result.freeSlots) {
    const start = formatDateTime(slot.startTime, timezone);
    const duration = `${slot.durationMinutes}min`;
    lines.push(`${dim("○")}  ${start}  ${dim(duration)}`);
  }
  return lines;
}

/** Format session action result. */
export function formatSessionAction(result: SessionActionResult): string[] {
  if (!result.success) return [red("Action failed.")];
  const status = result.nextStatus ? ` → status ${result.nextStatus}` : "";
  return [green(`✓ Action submitted.${dim(status)}`)];
}

/** Format session history as a timeline. */
export function formatSessionHistory(result: SessionHistoryResult, timezone: string): string[] {
  if (result.history.length === 0) return ["No history found."];

  return result.history.map((h) => {
    const time = formatDateTime(h.time, timezone);
    const op = h.operator === "student" ? "You" : h.operator === "teacher" ? "Teacher" : "System";
    return `${dim(time)}  ${bold(op)}  ${dim(h.code)}  status ${h.status}`;
  });
}
