import { defineCommand } from "citty";
import { getLessons, getAllLessons } from "../services/lesson";
import { readConfig } from "../services/config";
import { formatLessons } from "../presenters/lessons";
import { dim } from "../lib/color";

export default defineCommand({
  meta: { description: "Show your lesson history" },
  args: {
    json: { type: "boolean", description: "Output as JSON" },
    limit: { type: "string", description: "Show only first N lessons (default 20, ignored if --all without explicit limit)" },
    all: { type: "boolean", description: "Fetch all pages (up to 1000 lessons) before filtering" },
    upcoming: { type: "boolean", description: "Show only upcoming lessons" },
    past: { type: "boolean", description: "Show only completed lessons (default)" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const useJson = ctx.args.json === true;
    const fetchAll = ctx.args.all === true;

    // --all fetches all pages; otherwise page 1 (50 items)
    const { data: lessons, hitCap } = fetchAll
      ? await getAllLessons(config)
      : { data: (await getLessons(config, 1, 50)).data, hitCap: false };

    // Filter client-side (API kind filter is broken — only 'all' works)
    let filtered = lessons;
    if (ctx.args.upcoming === true) {
      filtered = filtered.filter((l) => l.group === "upcoming");
    } else if (ctx.args.past === true) {
      filtered = filtered.filter((l) => l.group === "completed");
    }
    // If neither flag: show all

    // --all without explicit --limit shows everything; otherwise default 20
    const limit = ctx.args.limit ? Number(ctx.args.limit) : (fetchAll ? undefined : 20);
    const sliced = limit ? filtered.slice(0, limit) : filtered;

    if (hitCap) {
      console.error("Warning: reached 1000-lesson safety cap. Older lessons may exist beyond this limit.");
    }

    if (useJson) {
      console.log(JSON.stringify(sliced, null, 2));
      return;
    }

    if (sliced.length === 0) {
      console.log("No lessons found.");
      return;
    }

    const lines = formatLessons(sliced, config.timezone_iana);
    console.log(lines.join("\n"));

    const hints: string[] = [];
    if (ctx.args.upcoming !== true && ctx.args.past !== true) hints.push("--upcoming", "--past");
    else if (ctx.args.upcoming === true) hints.push("--past");
    else if (ctx.args.past === true) hints.push("--upcoming");
    if (!fetchAll) hints.push("--all");
    if (hints.length > 0) {
      console.log("");
      console.log(dim(`  More: italki lessons ${hints.join(" ")}`));
    }
  },
});
