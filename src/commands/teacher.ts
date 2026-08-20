import { defineCommand } from "citty";
import { getTeacher } from "../services/teacher";
import { getSchedule } from "../services/schedule";
import { transformTeacher } from "../transforms/teacher";
import { transformSchedule } from "../transforms/schedule";
import { formatTeacher, formatTeacherSchedule } from "../presenters/teacher";
import { DEFAULT_TIMEZONE } from "../constants";
import { readConfig, resolveTimezone } from "../services/config";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Get a teacher's full profile" },
  args: {
    id: { type: "positional", description: "Teacher ID" },
    json: { type: "boolean", description: "Output as JSON" },
    packages: { type: "boolean", description: "Show package pricing tiers (implies --courses)" },
    courses: { type: "boolean", description: "Show course list with pricing" },
    stats: { type: "boolean", description: "Show session stats, education, certifications, experience" },
    schedule: { type: "boolean", description: "Show next 3 available time slots" },
    timezone: { type: "string", description: "IANA timezone for schedule slots (default: America/Bogota)" },
  },
  run: async (ctx) => {
    const id = Number(ctx.args.id);
    if (!id) {
      console.error("Error: teacher ID is required (e.g. 'italki teacher 9159592')");
      process.exit(1);
    }

    const config = await readConfig();
    const tz = resolveTimezone(ctx.args.timezone as string | undefined, config, DEFAULT_TIMEZONE);
    const showSchedule = ctx.args.schedule === true;

    const [profile, schedule] = await Promise.all([
      getTeacher(id),
      showSchedule ? getSchedule(id, 7, tz).catch(() => null) : Promise.resolve(null),
    ]);

    const transformed = transformTeacher(profile);
    const transformedSchedule = schedule ? transformSchedule(schedule) : null;
    const useJson = ctx.args.json === true;

    if (useJson) {
      const output = transformedSchedule
        ? { ...transformed, schedule: transformedSchedule }
        : transformed;
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    const showCourses = ctx.args.courses === true || ctx.args.packages === true;

    const lines = formatTeacher(transformed, {
      showPackages: ctx.args.packages === true,
      showCourses,
      showStats: ctx.args.stats === true,
      timezone: tz,
    });

    if (transformedSchedule) {
      lines.push(...formatTeacherSchedule(transformedSchedule, tz, id));
    }

    // Hint: suggest flags not yet used (don't repeat what user already passed)
    const hinted: string[] = [];
    if (!showCourses) hinted.push("--courses");
    else if (!ctx.args.packages) hinted.push("--packages");
    if (!ctx.args.stats) hinted.push("--stats");
    if (!ctx.args.schedule) hinted.push("--schedule");
    if (hinted.length > 0) {
      lines.push("", dim(`  More: italki teacher ${id} ${hinted.join(" ")}`));
    } else if (ctx.args.schedule) {
      lines.push("", dim(`  Full schedule: italki schedule ${id}`));
    }

    console.log(lines.join("\n"));
  },
});
