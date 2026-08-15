import { defineCommand } from "citty";
import { getSchedule } from "../services/schedule";
import { getTeacher } from "../services/teacher";
import { formatSchedule } from "../presenters/schedule";
import { DEFAULT_TIMEZONE } from "../constants";
import { readConfig, resolveTimezone } from "../services/config";

export default defineCommand({
  meta: { description: "Check a teacher's availability calendar" },
  args: {
    id: { type: "positional", description: "Teacher ID" },
    json: { type: "boolean", description: "Output as JSON" },
    timezone: { type: "string", description: "IANA timezone (e.g. America/Bogota, Asia/Tokyo)" },
  },
  run: async (ctx) => {
    const id = Number(ctx.args.id);
    if (!id) {
      console.error("Error: teacher ID is required (e.g. 'italki schedule 9159592')");
      process.exit(1);
    }

    const config = await readConfig();
    const tz = resolveTimezone(ctx.args.timezone as string | undefined, config, DEFAULT_TIMEZONE);
    const [schedule, teacher] = await Promise.all([
      getSchedule(id),
      getTeacher(id).catch(() => null),
    ]);

    // Piped output defaults to JSON (LLM/script consumers); terminal defaults to human-readable
    const useJson = ctx.args.json === true || !process.stdout.isTTY;

    if (useJson) {
      console.log(JSON.stringify(schedule, null, 2));
      return;
    }

    const teacherName = teacher?.data?.user_info?.nickname;
    const lines = formatSchedule(schedule, tz, teacherName, id);
    console.log(lines.join("\n"));
  },
});
