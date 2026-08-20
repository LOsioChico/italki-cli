import type { TeacherProfileResult } from "../transforms/teacher";
import { bold, dim, green, yellow, cyan } from "../lib/color";
import { formatDateTime, timeUntil } from "../lib/time-ago";

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatPrice(dollars: number | null): string {
  return dollars != null ? `$${dollars.toFixed(2)}` : "?";
}

function nextSlot(iso: string | null, timezone: string): string {
  if (!iso) return "—";
  return `${formatDateTime(iso, timezone)} (${timeUntil(iso, timezone)})`;
}

interface Row {
  label: string;
  values: string[];
  style?: (s: string) => string;
}

export function formatCompare(profiles: TeacherProfileResult[], timezone: string): string[] {
  const teachers = profiles;

  const names = teachers.map((t) => truncate(t.name, 18));
  const rows: Row[] = [
    {
      label: "Type",
      values: teachers.map((t) => (t.type === "pro" ? "PRO" : "TUTOR")),
      style: (s) => (s === "PRO" ? cyan(s) : dim(s)),
    },
    { label: "From", values: teachers.map((t) => t.country) },
    {
      label: "Price",
      values: teachers.map((t) => `from ${formatPrice(t.priceFrom)}`),
      style: green,
    },
    {
      label: "Trial",
      values: teachers.map((t) => {
        const trial = t.trial;
        return trial
          ? `${formatPrice(trial.price)} (${trial.lengthMinutes}min)`
          : "—";
      }),
    },
    {
      label: "Rating",
      values: teachers.map((t) => {
        const r = t.rating;
        return r != null ? `★${r}` : "new";
      }),
      style: yellow,
    },
    { label: "Sessions", values: teachers.map((t) => String(t.sessionCount)) },
    { label: "Students", values: teachers.map((t) => String(t.studentCount)) },
    {
      label: "Next slot",
      values: teachers.map((t) => nextSlot(t.availableTime90d, timezone)),
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
  const idLine = " ".repeat(labelWidth + 2) + teachers.map((t, i) => cell(`#${t.id}`, colWidths[i] ?? 0, dim)).join("  ");

  const body = rows.map((row) => {
    const label = dim(row.label.padEnd(labelWidth));
    const cells = row.values.map((v, i) => cell(v, colWidths[i] ?? 0, row.style));
    return `${label}  ${cells.join("  ")}`;
  });

  const ids = teachers.map((t) => t.id);
  const profileHints = ids.map((id) => `italki teacher ${id}`).join("  |  ");
  return [headerLine, idLine, "", ...body, "", dim(`  Times in ${timezone}`), "", dim(`  Profile: ${profileHints}  |  Schedule: italki schedule ${ids[0]}`)];
}
