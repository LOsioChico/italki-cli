import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchTeachers, searchAllTeachers, sortTeachers, type SearchSort } from "../services/search";
import { getTeacher } from "../services/teacher";
import { getSchedule } from "../services/schedule";
import { getReviews } from "../services/reviews";
import { getBalance } from "../services/finance";
import { getFoundation, getAnalytics } from "../services/user";
import { getLessons, getAllLessons } from "../services/lesson";
import { readConfig } from "../services/config";
import type { SearchFilters } from "../schemas/search";

function jsonResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function notLoggedInResult(): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: "Not logged in. Run 'italki login' first to save a session token." }],
    isError: true,
  };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "search_teachers",
    {
      description: "Search italki teachers by language with server-side filters. Sort is client-side (the API ignores sort_by). Use all=true to fetch all pages before sorting.",
      inputSchema: {
        language: z.string().describe("Language slug, e.g. english, spanish, chinese"),
        type: z.enum(["pro", "tutor"]).optional().describe("pro = professional teacher, tutor = community tutor"),
        country: z.string().optional().describe("ISO country code(s), comma-separated, e.g. US,GB"),
        speaks: z.string().optional().describe("Language(s) the teacher also speaks, comma-separated (AND logic)"),
        maxPrice: z.number().optional().describe("Max lesson price in dollars"),
        minPrice: z.number().optional().describe("Min lesson price in dollars"),
        native: z.boolean().optional().describe("Native speakers only"),
        category: z.string().optional().describe("Course category slug(s): language-essentials, business, test-preparation, kids, conversation, medical, technology"),
        tags: z.string().optional().describe("Tag code(s), comma-separated, e.g. T0090 for Programming/Coding"),
        hasTrial: z.boolean().optional().describe("Teachers offering trial lessons"),
        instant: z.boolean().optional().describe("Instant lesson available"),
        recording: z.boolean().optional().describe("italki Plus AI lesson summaries enabled"),
        available72h: z.boolean().optional().describe("Available in the next 72 hours"),
        weekday: z.string().optional().describe("Day names, comma-separated: mon,tue,wed,thu,fri,sat,sun"),
        page: z.number().optional().describe("Page number (default 1, 99 per page)"),
        all: z.boolean().optional().describe("Fetch all pages (batched, rate-limited) before sorting/limiting"),
        sort: z.enum(["rating", "price", "sessions", "name"]).optional().describe("Client-side sort"),
        limit: z.number().optional().describe("Return only the first N results"),
      },
    },
    async (args) => {
      const filters: SearchFilters = {
        language: args.language,
        teacherType: args.type,
        originCountry: args.country?.split(","),
        speaks: args.speaks?.split(","),
        maxPrice: args.maxPrice != null ? Math.round(args.maxPrice * 100) : undefined,
        minPrice: args.minPrice != null ? Math.round(args.minPrice * 100) : undefined,
        isNative: args.native,
        category: args.category?.split(",") as SearchFilters["category"],
        tags: args.tags?.split(","),
        hasTrial: args.hasTrial,
        instant: args.instant,
        recording: args.recording,
        available72h: args.available72h,
        weekday: args.weekday?.split(","),
      };

      let result = args.all === true
        ? await searchAllTeachers(filters)
        : await searchTeachers(filters, args.page ?? 1);

      if (args.sort) result = sortTeachers(result, args.sort as SearchSort);
      if (args.limit && args.limit > 0 && result.data) {
        result = { ...result, data: result.data.slice(0, args.limit) };
      }

      return jsonResult(result);
    },
  );

  server.registerTool(
    "get_teacher",
    {
      description: "Get a teacher's full profile: bio, languages, courses with pricing, stats, education, certifications.",
      inputSchema: { id: z.number().describe("Teacher ID (from search results)") },
    },
    async ({ id }) => jsonResult(await getTeacher(id)),
  );

  server.registerTool(
    "get_schedule",
    {
      description: "Get a teacher's availability calendar. Times are UTC — convert to the student's timezone yourself. available_schedule contains booked sessions; subtract teacher_lesson overlaps to get free time.",
      inputSchema: {
        id: z.number().describe("Teacher ID"),
        days: z.number().optional().describe("Days to fetch (default 28, max 90)"),
      },
    },
    async ({ id, days }) => jsonResult(await getSchedule(id, days ?? 28)),
  );

  server.registerTool(
    "get_reviews",
    {
      description: "Get a teacher's student reviews, paginated (max 100 per page). Teacher's picks are surfaced first. Filter by lesson language with the language param.",
      inputSchema: {
        id: z.number().describe("Teacher ID"),
        page: z.number().optional().describe("Page number (default 1)"),
        pageSize: z.number().optional().describe("Reviews per page (default 10, max 100)"),
        language: z.string().optional().describe("Filter by lesson language (e.g. english, spanish)"),
        allowEmpty: z.boolean().optional().describe("Include reviews with no text (default: excluded)"),
      },
    },
    async ({ id, page, pageSize, language, allowEmpty }) => jsonResult(await getReviews(id, page ?? 1, pageSize ?? 10, language, allowEmpty)),
  );

  server.registerTool(
    "compare_teachers",
    {
      description: "Fetch 2+ teacher profiles in parallel for side-by-side comparison.",
      inputSchema: { ids: z.array(z.number()).min(2).describe("Teacher IDs to compare") },
    },
    async ({ ids }) => jsonResult(await Promise.all(ids.map((id) => getTeacher(id)))),
  );

  server.registerTool(
    "get_balance",
    {
      description: "Get the authenticated student's italki credit balance. Requires login (run 'italki login' first).",
      inputSchema: {},
    },
    async () => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      return jsonResult(await getBalance(config));
    },
  );

  server.registerTool(
    "get_whoami",
    {
      description: "Get the authenticated student's profile (nickname, email, timezone, premium status, learning languages) and learning analytics (total lessons, hours, streaks). Requires login.",
      inputSchema: {},
    },
    async () => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const [foundation, analytics] = await Promise.all([
        getFoundation(config),
        getAnalytics(config).catch(() => null),
      ]);
      return jsonResult({ foundation: foundation.data, analytics });
    },
  );

  server.registerTool(
    "get_lessons",
    {
      description: "Get the authenticated student's lesson history. Filter client-side (the API kind filter is broken). Requires login.",
      inputSchema: {
        all: z.boolean().optional().describe("Fetch all pages (up to 1000 lessons) before filtering. Default: first page (50 lessons)."),
        upcoming: z.boolean().optional().describe("Only upcoming lessons"),
        past: z.boolean().optional().describe("Only completed lessons (default: all groups)"),
        limit: z.number().optional().describe("Return only the first N lessons (default 20, ignored if all=true without explicit limit)"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const fetchAll = args.all === true;
      const { data: lessons, hitCap } = fetchAll
        ? await getAllLessons(config)
        : { data: (await getLessons(config, 1, 50)).data, hitCap: false };

      let filtered = lessons;
      if (args.upcoming === true) {
        filtered = filtered.filter((l) => l.group === "upcoming");
      } else if (args.past === true) {
        filtered = filtered.filter((l) => l.group === "completed");
      }

      const limit = args.limit != null ? args.limit : (fetchAll ? undefined : 20);
      const sliced = limit ? filtered.slice(0, limit) : filtered;
      return jsonResult(hitCap ? { lessons: sliced, hitCap: true } : sliced);
    },
  );
}
