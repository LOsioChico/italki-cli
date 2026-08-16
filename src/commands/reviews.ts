import { defineCommand } from "citty";
import { getReviews } from "../services/reviews";
import { formatReviews } from "../presenters/reviews";
import { DEFAULT_TIMEZONE } from "../constants";
import { readConfig, resolveTimezone } from "../services/config";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Read a teacher's student reviews" },
  args: {
    id: { type: "positional", description: "Teacher ID" },
    page: { type: "string", description: "Page number (default 1)" },
    "page-size": { type: "string", description: "Reviews per page (default 10, max 100)" },
    language: { type: "string", description: "Filter by lesson language (e.g. english, spanish)" },
    "allow-empty": { type: "boolean", description: "Include reviews with no text (default: excluded)" },
    timezone: { type: "string", description: "IANA timezone for review dates (e.g. America/Bogota)" },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const id = Number(ctx.args.id);
    if (!id) {
      console.error("Error: teacher ID is required (e.g. 'italki reviews 9159592')");
      process.exit(1);
    }

    const config = await readConfig();
    const tz = resolveTimezone(ctx.args.timezone as string | undefined, config, DEFAULT_TIMEZONE);
    const page = ctx.args.page ? Number(ctx.args.page) : 1;
    const pageSize = ctx.args["page-size"] ? Number(ctx.args["page-size"]) : 10;
    const language = ctx.args.language || undefined;
    const allowEmpty = ctx.args["allow-empty"] === true;
    const response = await getReviews(id, page, pageSize, language, allowEmpty);

    const useJson = ctx.args.json === true;

    if (useJson) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }

    const lines = formatReviews(response, id, pageSize, language, tz);
    console.log(lines.join("\n"));

    const hints: string[] = [];
    if (!language) hints.push("--language <lang>");
    if (pageSize === 10) hints.push("--page-size 50");
    if (!allowEmpty) hints.push("--allow-empty");
    if (hints.length > 0) {
      console.log("");
      console.log(dim(`  More: italki reviews ${id} ${hints.join("  |  ")}`));
    }
    console.log("");
    console.log(dim(`  Profile: italki teacher ${id}  |  Schedule: italki schedule ${id}`));
  },
});
