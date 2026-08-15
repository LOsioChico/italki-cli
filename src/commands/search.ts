import { defineCommand } from "citty";
import { searchTeachers, searchAllTeachers, sortTeachers, type SearchSort } from "../services/search";
import { formatSearch } from "../presenters/search";
import type { SearchFilters } from "../schemas/search";

export default defineCommand({
  meta: { description: "Search italki teachers by language" },
  args: {
    language: { type: "positional", description: "Language slug (e.g. english, spanish)" },
    type: { type: "string", description: "pro or tutor" },
    country: { type: "string", description: "ISO country code(s), comma-separated (e.g. US,GB,CA)" },
    speaks: { type: "string", description: "Language slug(s) teacher speaks, comma-separated" },
    "max-price": { type: "string", description: "Max price in dollars (e.g. 20 for $20)" },
    "min-price": { type: "string", description: "Min price in dollars (e.g. 5 for $5)" },
    native: { type: "boolean", description: "Native speakers only" },
    category: { type: "string", description: "Category slug(s): language-essentials, business, test-preparation, kids, conversation, medical, technology" },
    tags: { type: "string", description: "Tag code(s), comma-separated (e.g. T0090 for Programming)" },
    "has-trial": { type: "boolean", description: "Teachers with trial lessons" },
    instant: { type: "boolean", description: "Instant lesson available" },
    recording: { type: "boolean", description: "italki Plus AI summaries enabled" },
    "available-72h": { type: "boolean", description: "Available in next 72h" },
    weekday: { type: "string", description: "Day names: mon,tue,wed,thu,fri,sat,sun" },
    page: { type: "string", description: "Page number (default 1)" },
    limit: { type: "string", description: "Show only first N results (e.g. 5)" },
    sort: { type: "string", description: "Sort: rating, price, sessions, name (default: API order)" },
    all: { type: "boolean", description: "Fetch all pages before sorting/limiting (batched, rate-limited)" },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const lang = ctx.args.language as string;
    if (!lang) {
      console.error("Error: language is required (e.g. 'italki search english')");
      process.exit(1);
    }

    const filters: SearchFilters = {
      language: lang,
      teacherType: ctx.args.type ? (ctx.args.type as "pro" | "tutor") : undefined,
      originCountry: ctx.args.country ? (ctx.args.country as string).split(",") : undefined,
      speaks: ctx.args.speaks ? (ctx.args.speaks as string).split(",") : undefined,
      maxPrice: ctx.args["max-price"] ? Math.round(Number(ctx.args["max-price"]) * 100) : undefined,
      minPrice: ctx.args["min-price"] ? Math.round(Number(ctx.args["min-price"]) * 100) : undefined,
      isNative: ctx.args.native as boolean,
      category: ctx.args.category ? (ctx.args.category as string).split(",") as Array<keyof typeof import("../constants").CATEGORIES> : undefined,
      tags: ctx.args.tags ? (ctx.args.tags as string).split(",") : undefined,
      hasTrial: ctx.args["has-trial"] as boolean,
      instant: ctx.args.instant as boolean,
      recording: ctx.args.recording as boolean,
      available72h: ctx.args["available-72h"] as boolean,
      weekday: ctx.args.weekday ? (ctx.args.weekday as string).split(",") : undefined,
    };

    const limit = ctx.args.limit ? Number(ctx.args.limit) : undefined;
    const sort = ctx.args.sort as SearchSort | undefined;

    const result = ctx.args.all === true
      ? await searchAllTeachers(filters)
      : await searchTeachers(filters, ctx.args.page ? Number(ctx.args.page) : 1);

    // Client-side sort (immutable) — API ignores sort_by
    const sortedResult = sort && sort in { rating: 1, price: 1, sessions: 1, name: 1 }
      ? sortTeachers(result, sort)
      : result;

    // Piped output defaults to JSON (LLM/script consumers); terminal defaults to human-readable
    const useJson = ctx.args.json === true || !process.stdout.isTTY;

    if (useJson) {
      const jsonResult = limit && sortedResult.data
        ? { ...sortedResult, data: sortedResult.data.slice(0, limit) }
        : sortedResult;
      console.log(JSON.stringify(jsonResult, null, 2));
      return;
    }

    const lines = formatSearch(sortedResult, filters, limit);
    console.log(lines.join("\n"));
  },
});
