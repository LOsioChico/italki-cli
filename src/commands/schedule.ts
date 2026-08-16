import { defineCommand } from "citty";
import { getSchedule } from "../services/schedule";
import { getTeacher } from "../services/teacher";
import { formatSchedule } from "../presenters/schedule";
import { DEFAULT_TIMEZONE } from "../constants";
import { readConfig, resolveTimezone } from "../services/config";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Check a teacher's availability calendar" },
  args: {
    id: { type: "positional", description: "Teacher ID" },
    json: { type: "boolean", description: "Output as JSON" },
    timezone: { type: "string", description: "IANA timezone (e.g. America/Bogota, Asia/Tokyo)" },
    days: { type: "string", description: "Days to fetch (default 28, max 90)" },
  },
  run: async (ctx) => {
    const id = Number(ctx.args.id);
    if (!id) {
      console.error("Error: teacher ID is required (e.g. 'italki schedule 9159592')");
      process.exit(1);
    }

    const config = await readConfig();
    const tz = resolveTimezone(ctx.args.timezone as string | undefined, config, DEFAULT_TIMEZONE);
    const days = Math.min(Number(ctx.args.days) || 28, 90);
    const [schedule, teacher] = await Promise.all([
      getSchedule(id, days, tz),
      getTeacher(id).catch(() => null),
    ]);

    const useJson = ctx.args.json === true;

    if (useJson) {
      console.log(JSON.stringify(schedule, null, 2));
      return;
    }

    const teacherName = teacher?.data?.user_info?.nickname;
    const lines = formatSchedule(schedule, tz, teacherName, id);
    console.log(lines.join("\n"));

    const hints: string[] = [];
    if (!ctx.args.timezone) hints.push(`--timezone ${tz}`);
    if (!ctx.args.days) hints.push("--days 7");
    hints.push(`italki teacher ${id} --schedule`);
    console.log("");
    console.log(dim(`  More: ${hints.join("  |  ")}`));
  },
});
