import type { WhoamiResult } from "../transforms/whoami";
import { bold } from "../lib/color";

/** Format the whoami command output (profile + learning stats). */
export function formatWhoami(result: WhoamiResult): string[] {
  if (!result.userId) return ["No user data in response."];

  const langStr = result.learningLanguages.map((l) => `${l.language} (${l.level})`).join(", ");

  const lines: string[] = [
    `${bold(result.nickname)} (user ${result.userId})`,
    `Email:     ${result.email}`,
    `Timezone:  ${result.timezone}`,
    `Premium:   ${result.isPremium ? "yes" : "no"}`,
  ];
  if (langStr) lines.push(`Learning:  ${langStr}`);

  if (result.analytics) {
    const a = result.analytics;
    lines.push("");
    lines.push(`Lessons:        ${a.totalLessons}`);
    lines.push(`Total hours:    ${a.totalHours.toFixed(1)}`);
    lines.push(`Longest streak: ${a.longestStreak} week(s)`);
    if (a.weeklyLessons > 0) {
      lines.push(`This week:      ${a.weeklyLessons} lesson(s)`);
    }
  }

  return lines;
}
