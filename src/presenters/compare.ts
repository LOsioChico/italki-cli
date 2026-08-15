import type { TeacherProfile } from "../schemas/teacher";
import { formatPrice, formatSessionLength } from "../constants";
import { bold, dim, green, yellow, cyan } from "../lib/color";
import { formatDateTime, timeUntil } from "../lib/time-ago";

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function nextSlot(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "—";
  return `${formatDateTime(iso, timezone)} (${timeUntil(iso)})`;
}

interface Row {
  label: string;
  values: string[];
  style?: (s: string) => string;
}

export function formatCompare(profiles: TeacherProfile[], timezone: string): string[] {
  const teachers = profiles.map((p) => p.data);

  const names = teachers.map((t) => truncate(t.user_info.nickname, 18));
  const rows: Row[] = [
    {
      label: "Type",
      values: teachers.map((t) => (t.user_info.is_pro ? "PRO" : "TUTOR")),
      style: (s) => (s === "PRO" ? cyan(s) : dim(s)),
    },
    { label: "From", values: teachers.map((t) => t.user_info.origin_country_id ?? "?") },
    {
      label: "Price",
      values: teachers.map((t) => `from ${formatPrice(t.course_info?.min_price)}`),
      style: green,
    },
    {
      label: "Trial",
      values: teachers.map((t) => {
        const c = t.course_info;
        return c?.has_trial && c.trial_price != null
          ? `${formatPrice(c.trial_price)} (${formatSessionLength(c.trial_length)})`
          : "—";
      }),
    },
    {
      label: "Rating",
      values: teachers.map((t) => {
        const r = t.teacher_info.overall_rating;
        return r && Number(r) > 0 ? `★${r}` : "new";
      }),
      style: yellow,
    },
    { label: "Sessions", values: teachers.map((t) => String(t.teacher_info.session_count ?? 0)) },
    { label: "Students", values: teachers.map((t) => String(t.teacher_info.student_count ?? 0)) },
    {
      label: "Next slot",
      values: teachers.map((t) => nextSlot(t.teacher_info.available_time_90d, timezone)),
    },
  ];

  const labelWidth = Math.max(...rows.map((r) => r.label.length));
  const colWidths = names.map((name, i) =>
    Math.max(name.length, ...rows.map((r) => (r.values[i] ?? "").length)),
  );

  // Style first, then pad — ANSI codes are zero-width, padding must use raw length
  const cell = (raw: string, width: number, style?: (s: string) => string): string =>
    (style ? style(raw) : raw) + " ".repeat(Math.max(0, width - raw.length));

  const headerLine = " ".repeat(labelWidth + 2) + names.map((n, i) => cell(n, colWidths[i] ?? 0, bold)).join("  ");
  const idLine = " ".repeat(labelWidth + 2) + teachers.map((t, i) => cell(`#${t.user_info.user_id}`, colWidths[i] ?? 0, dim)).join("  ");

  const body = rows.map((row) => {
    const label = dim(row.label.padEnd(labelWidth));
    const cells = row.values.map((v, i) => cell(v, colWidths[i] ?? 0, row.style));
    return `${label}  ${cells.join("  ")}`;
  });

  const ids = teachers.map((t) => t.user_info.user_id);
  const profileHints = ids.map((id) => `italki teacher ${id}`).join("  |  ");
  return [headerLine, idLine, "", ...body, "", dim(`  Times in ${timezone}`), "", dim(`  Profile: ${profileHints}  |  Schedule: italki schedule ${ids[0]}`)];
}
