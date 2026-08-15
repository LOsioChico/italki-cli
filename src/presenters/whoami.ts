import type { Foundation, Analytics } from "../schemas/user";
import { LEVEL_MAP } from "../constants";
import { bold } from "../lib/color";

/** Format the whoami command output (profile + learning stats). */
export function formatWhoami(foundation: Foundation, analytics: Analytics | null): string[] {
  const u = foundation.data?.user;
  if (!u) return ["No user data in response."];

  const learningLangs = foundation.data?.language_list?.filter((l) => l.is_learning === 1) ?? [];
  const langStr = learningLangs.map((l) => `${l.language} (${LEVEL_MAP[l.level ?? -1] ?? "?"})`).join(", ");

  const lines: string[] = [
    `${bold(u.nickname)} (user ${u.user_id})`,
    `Email:     ${u.email}`,
    `Timezone:  ${u.timezone_iana}`,
    `Premium:   ${u.is_premium ? "yes" : "no"}`,
  ];
  if (langStr) lines.push(`Learning:  ${langStr}`);

  if (analytics) {
    lines.push("");
    lines.push(`Lessons:        ${analytics.total_lessons}`);
    lines.push(`Total hours:    ${(analytics.total_lessons_min / 60).toFixed(1)}`);
    lines.push(`Longest streak: ${analytics.longest_streak} week(s)`);
    if (analytics.weekly_lessons > 0) {
      lines.push(`This week:      ${analytics.weekly_lessons} lesson(s)`);
    }
  }

  return lines;
}
