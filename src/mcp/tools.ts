import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchTeachers, searchAllTeachers, sortTeachers, type SearchSort } from "../services/search";
import { getTeacher } from "../services/teacher";
import { getSchedule } from "../services/schedule";
import { getReviews } from "../services/reviews";
import { getBalance } from "../services/finance";
import { getFoundation, getAnalytics } from "../services/user";
import { getLessons, getAllLessons } from "../services/lesson";
import { readConfig, resolveTimezone } from "../services/config";
import { DEFAULT_TIMEZONE } from "../constants";
import { formatSearch } from "../presenters/search";
import { formatTeacher, formatTeacherSchedule } from "../presenters/teacher";
import { formatSchedule } from "../presenters/schedule";
import { formatReviews } from "../presenters/reviews";
import { formatCompare } from "../presenters/compare";
import { formatBalance } from "../presenters/balance";
import { formatWhoami } from "../presenters/whoami";
import { formatLessons } from "../presenters/lessons";
import type { SearchFilters } from "../schemas/search";

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: true };

function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function textResult(lines: string[]): ToolResult {
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

function notLoggedInResult(): ToolResult {
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
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
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

      if (args.json === true) return jsonResult(result);
      return textResult(formatSearch(result, filters, args.limit));
    },
  );

  server.registerTool(
    "get_teacher",
    {
      description: "Get a teacher's full profile: bio, languages, courses with pricing, stats, education, certifications.",
      inputSchema: {
        id: z.number().describe("Teacher ID (from search results)"),
        courses: z.boolean().optional().describe("Show course list with pricing"),
        packages: z.boolean().optional().describe("Show package pricing tiers (implies courses)"),
        stats: z.boolean().optional().describe("Show session stats, education, certifications, experience"),
        schedule: z.boolean().optional().describe("Show next 3 available time slots"),
        timezone: z.string().optional().describe("IANA timezone for schedule slots (default: America/Bogota)"),
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const showSchedule = args.schedule === true;

      const [profile, schedule] = await Promise.all([
        getTeacher(args.id),
        showSchedule ? getSchedule(args.id, 7).catch(() => null) : Promise.resolve(null),
      ]);

      if (args.json === true) return jsonResult(profile);

      const showCourses = args.courses === true || args.packages === true;
      const lines = formatTeacher(profile, {
        showPackages: args.packages === true,
        showCourses,
        showStats: args.stats === true,
        timezone: tz,
      });

      if (schedule) {
        lines.push(...formatTeacherSchedule(schedule, tz, args.id));
      }

      return textResult(lines);
    },
  );

  server.registerTool(
    "get_schedule",
    {
      description: "Get a teacher's availability calendar. Times are UTC — convert to the student's timezone yourself. available_schedule contains booked sessions; subtract teacher_lesson overlaps to get free time.",
      inputSchema: {
        id: z.number().describe("Teacher ID"),
        days: z.number().optional().describe("Days to fetch (default 28, max 90)"),
        timezone: z.string().optional().describe("IANA timezone (e.g. America/Bogota, Asia/Tokyo)"),
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const days = Math.min(args.days ?? 28, 90);

      const [schedule, teacher] = await Promise.all([
        getSchedule(args.id, days),
        getTeacher(args.id).catch(() => null),
      ]);

      if (args.json === true) return jsonResult(schedule);

      const teacherName = teacher?.data?.user_info?.nickname;
      return textResult(formatSchedule(schedule, tz, teacherName, args.id));
    },
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
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 10;
      const response = await getReviews(args.id, page, pageSize, args.language, args.allowEmpty);

      if (args.json === true) return jsonResult(response);
      return textResult(formatReviews(response, args.id, pageSize, args.language));
    },
  );

  server.registerTool(
    "compare_teachers",
    {
      description: "Fetch 2+ teacher profiles in parallel for side-by-side comparison.",
      inputSchema: {
        ids: z.array(z.number()).min(2).describe("Teacher IDs to compare"),
        timezone: z.string().optional().describe("IANA timezone for next-slot times (default: America/Bogota)"),
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const results = await Promise.allSettled(args.ids.map((id) => getTeacher(id)));
      const profiles = results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getTeacher>>> => r.status === "fulfilled")
        .map((r) => r.value);

      if (args.json === true) return jsonResult(profiles);
      if (profiles.length < 2) return textResult(["Need at least 2 valid teacher IDs to compare."]);
      return textResult(formatCompare(profiles, tz));
    },
  );

  server.registerTool(
    "get_balance",
    {
      description: "Get the authenticated student's italki credit balance. Requires login (run 'italki login' first).",
      inputSchema: {
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const balance = await getBalance(config);

      if (args.json === true) return jsonResult(balance.data);
      return textResult(formatBalance(balance));
    },
  );

  server.registerTool(
    "get_whoami",
    {
      description: "Get the authenticated student's profile (nickname, email, timezone, premium status, learning languages) and learning analytics (total lessons, hours, streaks). Requires login.",
      inputSchema: {
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const [foundation, analytics] = await Promise.all([
        getFoundation(config),
        getAnalytics(config).catch(() => null),
      ]);

      if (args.json === true) return jsonResult({ foundation: foundation.data, analytics });
      return textResult(formatWhoami(foundation, analytics));
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
        timezone: z.string().optional().describe("IANA timezone for lesson times (default: from login config)"),
        json: z.boolean().optional().describe("Output raw JSON instead of human-readable text"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
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

      if (args.json === true) {
        return jsonResult(hitCap ? { lessons: sliced, hitCap: true } : sliced);
      }

      const lines = formatLessons(sliced, tz);
      if (hitCap) lines.unshift("Warning: reached 1000-lesson safety cap. Older lessons may exist beyond this limit.");
      return textResult(lines);
    },
  );
}
