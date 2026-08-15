// Relative time formatting — "3 days ago", "2 hours ago", "just now"
export function timeAgo(date: Date | string | number): string {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

// Relative time for future dates — "today", "tomorrow", "in 2 days", "in 3 months"
export function timeUntil(date: Date | string | number): string {
  const d = new Date(date);
  const seconds = Math.floor((d.getTime() - Date.now()) / 1000);
  if (seconds < 0) return timeAgo(date);
  if (seconds < 3600) return "today";
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return "today";
  const days = Math.floor(hours / 24);
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `in ${months} month${months > 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  return `in ${years} year${years > 1 ? "s" : ""}`;
}

// Shared date/time format — "Sun, Aug 16 at 02:00" (future) or "Wed, May 20, 2026 at 16:30" (past)
// Future slots (within 1 year): no year. Past events: include year.
export function formatDateTime(iso: string, timezone?: string, opts: { showYear?: boolean } = {}): string {
  const d = new Date(iso);
  const showYear = opts.showYear ?? (d.getTime() < Date.now());
  const raw = d.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(showYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // toLocaleString produces "Sun, Aug 16, 02:00" or "Sun, Aug 16, 2026, 02:00"
  // Replace last comma before time with " at"
  return raw.replace(/, (?=\d{2}:\d{2})/, " at");
}

// Time-only format — "02:00" (24h, with timezone)
export function formatTimeOnly(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Consistent duration: "30min", "45min", "1h", "1h15min", "2h30min"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

// Minimum bookable slot — lessons start at 30 min
const MIN_SLOT_MINUTES = 30;

type SlotLike = { start_time: string; end_time: string };

// Subtract booked sessions from available slots, return free sub-slots >= 30 min.
// available_schedule is the container, teacher_lesson are holes inside it.
export function subtractBooked<T extends SlotLike>(available: T[], booked: T[]): T[] {
  const result: T[] = [];
  for (const avail of available) {
    const aStart = new Date(avail.start_time).getTime();
    const aEnd = new Date(avail.end_time).getTime();
    const overlaps: Array<[number, number]> = booked
      .map((b) => [new Date(b.start_time).getTime(), new Date(b.end_time).getTime()] as [number, number])
      .filter(([bStart, bEnd]) => bStart < aEnd && bEnd > aStart)
      .sort((a, b) => a[0] - b[0]);

    if (overlaps.length === 0) {
      if ((aEnd - aStart) / (1000 * 60) >= MIN_SLOT_MINUTES) result.push(avail);
      continue;
    }

    let cursor = aStart;
    for (const [bStart, bEnd] of overlaps) {
      if (bStart > cursor && (bStart - cursor) / (1000 * 60) >= MIN_SLOT_MINUTES) {
        result.push({ ...avail, start_time: new Date(cursor).toISOString(), end_time: new Date(bStart).toISOString() });
      }
      cursor = Math.max(cursor, bEnd);
    }
    if (cursor < aEnd && (aEnd - cursor) / (1000 * 60) >= MIN_SLOT_MINUTES) {
      result.push({ ...avail, start_time: new Date(cursor).toISOString(), end_time: new Date(aEnd).toISOString() });
    }
  }
  return result;
}
