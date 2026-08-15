import { defineCommand } from "citty";
import { getTeacher } from "../services/teacher";
import { formatCompare } from "../presenters/compare";
import { DEFAULT_TIMEZONE } from "../constants";
import { readConfig, resolveTimezone } from "../services/config";

export default defineCommand({
  meta: { description: "Compare teachers side-by-side" },
  args: {
    id: { type: "positional", description: "Teacher IDs (2+, space-separated)" },
    timezone: { type: "string", description: "IANA timezone for next-slot times (default: America/Bogota)" },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const ids = (ctx.args._ ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length < 2) {
      console.error("Error: pass 2+ teacher IDs (e.g. 'italki compare 9159592 32917414')");
      process.exit(1);
    }

    const config = await readConfig();
    const tz = resolveTimezone(ctx.args.timezone as string | undefined, config, DEFAULT_TIMEZONE);
    const results = await Promise.allSettled(ids.map((id) => getTeacher(id)));
    const failed = ids.filter((_, i) => results[i]?.status === "rejected");
    if (failed.length > 0) {
      console.error(`Warning: could not fetch teacher(s) ${failed.join(", ")} — they may not exist.`);
    }
    const profiles = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getTeacher>>> => r.status === "fulfilled")
      .map((r) => r.value);

    if (profiles.length < 2) {
      console.error("Error: need at least 2 valid teacher IDs to compare.");
      process.exit(1);
    }

    // Piped output defaults to JSON (LLM/script consumers); terminal defaults to human-readable
    const useJson = ctx.args.json === true || !process.stdout.isTTY;

    if (useJson) {
      console.log(JSON.stringify(profiles, null, 2));
      return;
    }

    console.log(formatCompare(profiles, tz).join("\n"));
  },
});
