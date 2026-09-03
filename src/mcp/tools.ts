import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchTeachers, searchAllTeachers, sortTeachers, type SearchSort } from "../services/search";
import { getTeacher } from "../services/teacher";
import { getSchedule } from "../services/schedule";
import { getReviews } from "../services/reviews";
import { getBalance } from "../services/finance";
import { getFoundation, getAnalytics } from "../services/user";
import { getLessons, getAllLessons } from "../services/lesson";
import { createOrder, payOrder, getTimeChangeSlots, submitSessionAction, getSessionHistory, getSessionDetail } from "../services/booking";
import { readConfig, resolveTimezone } from "../services/config";
import { DEFAULT_TIMEZONE } from "../constants";
import { transformSearch } from "../transforms/search";
import { transformTeacher, resolveCoursePrice, type ResolvedPrice } from "../transforms/teacher";
import { transformSchedule, expandStarts } from "../transforms/schedule";
import { transformReviews } from "../transforms/reviews";
import { transformLessons } from "../transforms/lessons";
import { transformTimeChangeSlots, transformSessionAction, transformSessionHistory } from "../transforms/booking";
import { transformBalance } from "../transforms/balance";
import { transformWhoami } from "../transforms/whoami";
import { formatSearch } from "../presenters/search";
import { formatTeacher, formatTeacherSchedule } from "../presenters/teacher";
import { formatSchedule } from "../presenters/schedule";
import { formatReviews } from "../presenters/reviews";
import { formatCompare } from "../presenters/compare";
import { formatBalance } from "../presenters/balance";
import { formatWhoami } from "../presenters/whoami";
import { formatLessons } from "../presenters/lessons";
import { formatTimeChangeSlots, formatSessionAction, formatSessionHistory } from "../presenters/booking";
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
      description: "Search italki teachers by language with server-side filters. Sort is client-side (the API ignores sort_by). Use all=true to fetch all pages before sorting. Returns translated JSON by default (dollars, tag names, minutes). Pass text=true for compact human-readable output.",
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
        text: z.boolean().optional().describe("Output compact human-readable text instead of JSON"),
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

      const transformed = transformSearch(result);
      if (args.limit && args.limit > 0) {
        transformed.teachers = transformed.teachers.slice(0, args.limit);
      }

      if (args.text === true) return textResult(formatSearch(transformed, filters, args.limit));
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "get_teacher",
    {
      description: "Get a teacher's full profile: bio, languages, courses with pricing, stats, education, certifications. Returns translated JSON by default (dollars, tag names, level names, minutes). Pass text=true for human-readable output.",
      inputSchema: {
        id: z.number().describe("Teacher ID (from search results)"),
        courses: z.boolean().optional().describe("Show course list with pricing"),
        packages: z.boolean().optional().describe("Show package pricing tiers (implies courses)"),
        stats: z.boolean().optional().describe("Show session stats, education, certifications, experience"),
        schedule: z.boolean().optional().describe("Show next 3 available time slots"),
        timezone: z.string().optional().describe("IANA timezone for schedule slots (default: America/Bogota)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const showSchedule = args.schedule === true;

      const [profile, schedule] = await Promise.all([
        getTeacher(args.id),
        showSchedule ? getSchedule(args.id, 7, tz).catch(() => null) : Promise.resolve(null),
      ]);

      const transformed = transformTeacher(profile);
      const transformedSchedule = schedule ? transformSchedule(schedule) : null;

      if (args.text === true) {
        const showCourses = args.courses === true || args.packages === true;
        const lines = formatTeacher(transformed, {
          showPackages: args.packages === true,
          showCourses,
          showStats: args.stats === true,
          timezone: tz,
        });

        if (transformedSchedule) {
          lines.push(...formatTeacherSchedule(transformedSchedule, tz, args.id));
        }

        return textResult(lines);
      }

      const output = transformedSchedule
        ? { ...transformed, schedule: transformedSchedule }
        : transformed;
      return jsonResult(output);
    },
  );

  server.registerTool(
    "get_schedule",
    {
      description: "Get a teacher's availability calendar. Returns translated JSON by default: free slots (booked sessions subtracted), booked slots, advance booking hours, total free minutes. Pass text=true for human-readable output grouped by day. Pass duration (minutes, >= 30) to expand free blocks into concrete lesson starts that fit.",
      inputSchema: {
        id: z.number().describe("Teacher ID"),
        days: z.number().optional().describe("Days to fetch (default 28, max 90)"),
        timezone: z.string().optional().describe("IANA timezone (e.g. America/Bogota, Asia/Tokyo)"),
        duration: z.number().optional().describe("Lesson length in minutes (>= 30). Expands free blocks into bookable start times where start + duration fits inside the block."),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const days = Math.min(args.days ?? 28, 90);

      const [schedule, teacher] = await Promise.all([
        getSchedule(args.id, days, tz),
        getTeacher(args.id).catch(() => null),
      ]);

      const transformed = transformSchedule(schedule);
      if (args.duration != null) {
        if (args.duration < 30) {
          return { content: [{ type: "text", text: `duration must be >= 30 minutes, got ${args.duration}` }], isError: true };
        }
        transformed.freeSlots = expandStarts(transformed.freeSlots, args.duration);
        transformed.totalFreeMinutes = transformed.freeSlots.length * args.duration;
      }

      if (args.text === true) {
        const teacherName = teacher?.data?.user_info?.nickname;
        return textResult(formatSchedule(transformed, tz, teacherName, args.id));
      }
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "get_reviews",
    {
      description: "Get a teacher's student reviews, paginated (max 100 per page). Teacher's picks are surfaced first. Filter by lesson language with the language param. Returns translated JSON by default. Pass text=true for human-readable output.",
      inputSchema: {
        id: z.number().describe("Teacher ID"),
        page: z.number().optional().describe("Page number (default 1)"),
        pageSize: z.number().optional().describe("Reviews per page (default 10, max 100)"),
        language: z.string().optional().describe("Filter by lesson language (e.g. english, spanish)"),
        allowEmpty: z.boolean().optional().describe("Include reviews with no text (default: excluded)"),
        timezone: z.string().optional().describe("IANA timezone for review dates (e.g. America/Bogota)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 10;
      const response = await getReviews(args.id, page, pageSize, args.language, args.allowEmpty);

      const transformed = transformReviews(response);

      if (args.text === true) return textResult(formatReviews(transformed, args.id, pageSize, args.language, tz));
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "compare_teachers",
    {
      description: "Fetch 2+ teacher profiles in parallel for side-by-side comparison. Returns translated JSON array by default. Pass text=true for a comparison table.",
      inputSchema: {
        ids: z.array(z.number()).min(2).describe("Teacher IDs to compare"),
        timezone: z.string().optional().describe("IANA timezone for next-slot times (default: America/Bogota)"),
        text: z.boolean().optional().describe("Output human-readable comparison table instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const results = await Promise.allSettled(args.ids.map((id) => getTeacher(id)));
      const profiles = results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getTeacher>>> => r.status === "fulfilled")
        .map((r) => r.value);

      const transformed = profiles.map(transformTeacher);

      if (args.text === true) {
        if (transformed.length < 2) return textResult(["Need at least 2 valid teacher IDs to compare."]);
        return textResult(formatCompare(transformed, tz));
      }
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "get_balance",
    {
      description: "Get the authenticated student's italki credit balance (in dollars). Requires login (run 'italki login' first). Returns JSON by default. Pass text=true for human-readable output.",
      inputSchema: {
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const balance = await getBalance(config);

      const transformed = transformBalance(balance);

      if (args.text === true) return textResult(formatBalance(transformed));
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "get_whoami",
    {
      description: "Get the authenticated student's profile (nickname, email, timezone, premium status, learning languages with level names) and learning analytics (total lessons, hours, streaks). Requires login. Returns JSON by default. Pass text=true for human-readable output.",
      inputSchema: {
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const [foundation, analytics] = await Promise.all([
        getFoundation(config),
        getAnalytics(config).catch(() => null),
      ]);

      const transformed = transformWhoami(foundation, analytics);

      if (args.text === true) return textResult(formatWhoami(transformed));
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "get_lessons",
    {
      description: "Get the authenticated student's lesson history. Filter client-side (the API kind filter is broken). Requires login. Returns translated JSON by default (dollars, minutes). Pass text=true for human-readable output.",
      inputSchema: {
        all: z.boolean().optional().describe("Fetch all pages (up to 1000 lessons) before filtering. Default: first page (50 lessons)."),
        upcoming: z.boolean().optional().describe("Only upcoming lessons (includes action_required, waiting, unscheduled groups)"),
        past: z.boolean().optional().describe("Only completed lessons (default: all groups)"),
        limit: z.number().optional().describe("Return only the first N lessons (default 20, ignored if all=true without explicit limit)"),
        timezone: z.string().optional().describe("IANA timezone for lesson times (default: from login config)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
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
        filtered = filtered.filter((l) => l.group !== "completed" && l.group !== "canceled");
      } else if (args.past === true) {
        filtered = filtered.filter((l) => l.group === "completed");
      }

      const limit = args.limit != null ? args.limit : (fetchAll ? undefined : 20);
      const sliced = limit ? filtered.slice(0, limit) : filtered;

      const transformed = transformLessons(sliced);

      if (args.text === true) {
        const lines = formatLessons(transformed, tz);
        if (hitCap) lines.unshift("Warning: reached 1000-lesson safety cap. Older lessons may exist beyond this limit.");
        return textResult(lines);
      }

      return jsonResult(hitCap ? { lessons: transformed, hitCap: true } : transformed);
    },
  );

  // --- Booking tools (require login) ---

  server.registerTool(
    "book_lesson",
    {
      description: "Book a lesson with a teacher. Creates an order and pays immediately. Requires login. Pass dry_run=true to preview without booking. For non-trial lessons pass duration (30/45/60/90) — with course_id when the teacher has multiple courses — or an explicit course_price_id.",
      inputSchema: {
        teacher_id: z.number().describe("Teacher ID (from search results)"),
        time: z.string().describe("Lesson start time in ISO 8601 (e.g. 2026-08-29T19:00:00Z)"),
        session_type: z.enum(["trial", "single", "package"]).optional().describe("Session type (default: trial)"),
        language: z.string().optional().describe("Lesson language code (auto-detected from teacher profile if omitted)"),
        duration: z.number().optional().describe("Lesson length in minutes (30/45/60/90). Resolves the matching course_price_id from the teacher's price list. Without it, the first price entry (usually 30min) is used."),
        course_id: z.number().optional().describe("Course ID — required with duration when the teacher offers multiple courses in the lesson language"),
        course_price_id: z.number().optional().describe("Explicit course_price_id (overrides duration). Validated against the teacher's price list."),
        im_type: z.enum(["zoom", "skype", "teams"]).optional().describe("IM platform (default: zoom)"),
        no_balance: z.boolean().optional().describe("Skip credits, pay with other method (default: false = use credits)"),
        dry_run: z.boolean().optional().describe("Preview without creating order (default: false)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();

      const teacherId = args.teacher_id;
      const timeStart = args.time;
      const sessionType = args.session_type ?? "trial";
      const imType = args.im_type ?? "zoom";
      const noBalance = args.no_balance === true;
      const dryRun = args.dry_run === true;

      const startDate = new Date(timeStart);
      if (isNaN(startDate.getTime())) {
        return { content: [{ type: "text", text: `Invalid time: ${timeStart}. Use ISO 8601.` }], isError: true };
      }

      const lessonTypeMap = { trial: 3, single: 1, package: 2 } as const;
      const lessonType = lessonTypeMap[sessionType as keyof typeof lessonTypeMap];
      if (!lessonType) {
        return { content: [{ type: "text", text: `Invalid session_type: ${sessionType}` }], isError: true };
      }

      const imTypeMap = { zoom: "Z", skype: "1", teams: "T" } as const;
      const imTypeCode = imTypeMap[imType as keyof typeof imTypeMap];
      if (!imTypeCode) {
        return { content: [{ type: "text", text: `Invalid im_type: ${imType}` }], isError: true };
      }

      // Fetch teacher profile for language + course_price_id
      const teacher = await getTeacher(teacherId);
      const teachLangs = teacher.data?.teacher_info?.teach_language ?? [];
      const language = args.language ?? teachLangs[0]?.language ?? "";
      if (!language) {
        return { content: [{ type: "text", text: "Could not determine lesson language. Pass language explicitly." }], isError: true };
      }

      let coursePriceId: number;
      let resolved: ResolvedPrice | null = null;
      if (sessionType === "trial") {
        coursePriceId = -1;
      } else {
        try {
          resolved = resolveCoursePrice(teacher, {
            language,
            courseId: args.course_id,
            durationMinutes: args.duration,
            coursePriceId: args.course_price_id,
          });
        } catch (err) {
          return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
        }
        coursePriceId = resolved.coursePriceId;
      }

      // order_type: 11 for all bookings (verified from HAR — both trial and single use 11)
      const orderType = 11;

      const summary = {
        teacherId,
        teacherName: teacher.data?.user_info?.nickname ?? `Teacher ${teacherId}`,
        language,
        sessionType,
        lessonType,
        coursePriceId,
        ...(resolved ? { courseId: resolved.courseId, courseTitle: resolved.courseTitle, durationMinutes: resolved.sessionLengthMinutes, sessionPrice: resolved.sessionPrice } : {}),
        timeStart,
        imType,
        imTypeCode,
        orderType,
        noBalance,
      };

      if (dryRun) {
        return jsonResult(summary);
      }

      const order = await createOrder(config, {
        teacherId,
        language,
        lessonType,
        coursePriceId,
        timeStartList: [timeStart],
        isInstant: false,
        lessonCount: 1,
        imType: imTypeCode,
        studentId: config.user_id,
        orderType,
      });

      const payment = await payOrder(config, order.order_management_id, noBalance);
      const sessionId = payment.order_result?.lesson_info?.lesson_ids?.[0];

      const result = {
        orderId: order.order_management_id,
        sessionId,
        teacherName: summary.teacherName,
        language,
        sessionType,
        ...(resolved ? { courseTitle: resolved.courseTitle, durationMinutes: resolved.sessionLengthMinutes, sessionPrice: resolved.sessionPrice } : {}),
        timeStart,
        paid: true,
        usedCredits: !noBalance,
      };

      if (args.text === true) {
        return textResult([
          `✓ Booked ${sessionType} lesson with ${summary.teacherName}`,
          resolved ? `  Class:      ${resolved.courseTitle} (${resolved.sessionLengthMinutes}min, $${resolved.sessionPrice})` : "",
          `  Time:       ${timeStart}`,
          `  Language:   ${language}`,
          `  Order ID:   ${order.order_management_id}`,
          sessionId ? `  Session ID: ${sessionId}` : "",
          `  Credits:    ${noBalance ? "not used" : "used"}`,
        ].filter(Boolean));
      }
      return jsonResult(result);
    },
  );

  server.registerTool(
    "reschedule_lesson",
    {
      description: "Reschedule a lesson. Without --time, shows available slots. With --time, submits the reschedule request. Requires login.",
      inputSchema: {
        session_id: z.number().describe("Session/lesson ID"),
        time: z.string().optional().describe("New lesson time in ISO 8601. If omitted, shows available slots."),
        days: z.number().optional().describe("Days to search ahead for slots (default: 28)"),
        timezone: z.string().optional().describe("IANA timezone for slot display (default: from login config)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);
      const days = args.days ?? 28;
      const sessionId = args.session_id;

      // Compute date range — date-only format (same as schedule endpoint)
      const now = new Date();
      const startStr = now.toLocaleDateString("en-CA", { timeZone: tz });
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const endStr = endDate.toLocaleDateString("en-CA", { timeZone: tz });

      if (!args.time) {
        const raw = await getTimeChangeSlots(config, sessionId, startStr, endStr);
        const transformed = transformTimeChangeSlots(raw);
        if (args.text === true) return textResult(formatTimeChangeSlots(transformed, tz));
        return jsonResult(transformed);
      }

      const newTime = args.time;
      const newDate = new Date(newTime);
      if (isNaN(newDate.getTime())) {
        return { content: [{ type: "text", text: `Invalid time: ${newTime}. Use ISO 8601.` }], isError: true };
      }

      // Fetch session detail to get action_list (reschedule action + params)
      const detail = await getSessionDetail(config, sessionId);
      const actionList = detail.data?.action_list ?? [];
      const sessionObj = detail.data?.session_obj;
      const currentStatus = sessionObj?.status ?? "6";
      // last_operate_time is in session_obj, NOT at data level (verified from HAR)
      const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

      const rescheduleAction =
        actionList.find((a) => a.action === "student_change_time_after_deduct") ??
        actionList.find((a) => a.action === "student_change_time_again");

      if (!rescheduleAction) {
        return { content: [{ type: "text", text: `No reschedule action available. Actions: ${actionList.map((a) => a.action).join(", ") || "none"}` }], isError: true };
      }

      const extraParams = rescheduleAction.extra_params;
      const needOtherParams = rescheduleAction.need_other_params ?? 1;
      const raw = await submitSessionAction(config, sessionId, {
        status: currentStatus,
        action: rescheduleAction.action,
        needOtherParams,
        lastOperateTime,
        newSessionTime: newTime,
        extraParams: {
          code: extraParams?.code ?? "TS106",
          primaryLevel: extraParams?.primary_level ?? 0,
          lessonTimeAfter: extraParams?.lesson_time_after ?? "",
        },
      });

      const transformed = transformSessionAction(raw);
      if (args.text === true) return textResult(formatSessionAction(transformed));
      return jsonResult({ sessionId, newTime, ...transformed });
    },
  );

  server.registerTool(
    "cancel_lesson",
    {
      description: "Cancel a lesson. Requires login.",
      inputSchema: {
        session_id: z.number().describe("Session/lesson ID"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const sessionId = args.session_id;

      // Fetch session detail to get action_list (cancel action + params)
      const detail = await getSessionDetail(config, sessionId);
      const actionList = detail.data?.action_list ?? [];
      const sessionObj = detail.data?.session_obj;
      const currentStatus = sessionObj?.status ?? "6";
      // last_operate_time is in session_obj, NOT at data level (verified from HAR)
      const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

      const cancelAction =
        actionList.find((a) => a.action === "student_cancel_after_deduct") ??
        actionList.find((a) => a.action === "student_cancel_reschedule_request");

      if (!cancelAction) {
        return { content: [{ type: "text", text: `No cancel action available. Actions: ${actionList.map((a) => a.action).join(", ") || "none"}` }], isError: true };
      }

      const extraParams = cancelAction.extra_params;
      const needOtherParams = cancelAction.need_other_params ?? 0;
      const raw = await submitSessionAction(config, sessionId, {
        status: currentStatus,
        action: cancelAction.action,
        needOtherParams,
        lastOperateTime,
        extraParams: {
          code: extraParams?.code ?? "TP140",
          primaryLevel: extraParams?.primary_level ?? 0,
          lessonTimeAfter: extraParams?.lesson_time_after ?? "",
        },
      });

      const transformed = transformSessionAction(raw);
      if (args.text === true) return textResult(formatSessionAction(transformed));
      return jsonResult({ sessionId, ...transformed });
    },
  );

  server.registerTool(
    "get_session_history",
    {
      description: "Get the status change history for a session (timeline of bookings, reschedules, cancellations). Requires login.",
      inputSchema: {
        session_id: z.number().describe("Session/lesson ID"),
        timezone: z.string().optional().describe("IANA timezone for timestamps (default: from login config)"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const tz = resolveTimezone(args.timezone, config, DEFAULT_TIMEZONE);

      const raw = await getSessionHistory(config, args.session_id);
      const transformed = transformSessionHistory(raw);
      if (args.text === true) return textResult(formatSessionHistory(transformed, tz));
      return jsonResult(transformed);
    },
  );

  server.registerTool(
    "confirm_lesson",
    {
      description: "Confirm a completed lesson (status 7 → F). Use after a lesson ends and needs student confirmation. Requires login.",
      inputSchema: {
        session_id: z.number().describe("Session/lesson ID"),
        text: z.boolean().optional().describe("Output human-readable text instead of JSON"),
      },
    },
    async (args) => {
      const config = await readConfig();
      if (!config) return notLoggedInResult();
      const sessionId = args.session_id;

      // Fetch session detail to get action_list + last_operate_time
      const detail = await getSessionDetail(config, sessionId);
      const actionList = detail.data?.action_list ?? [];
      const sessionObj = detail.data?.session_obj;
      const currentStatus = sessionObj?.status ?? "7";
      const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

      const confirmAction = actionList.find((a) => a.action === "student_complete_and_comment");

      if (!confirmAction) {
        return { content: [{ type: "text", text: `No confirm action available. Actions: ${actionList.map((a) => a.action).join(", ") || "none"}` }], isError: true };
      }

      const extraParams = confirmAction.extra_params;
      const raw = await submitSessionAction(config, sessionId, {
        status: currentStatus,
        action: confirmAction.action,
        needOtherParams: confirmAction.need_other_params ?? 1,
        lastOperateTime,
        extraParams: {
          code: extraParams?.code ?? "LV001",
          primaryLevel: extraParams?.primary_level ?? 1,
          lessonTimeAfter: extraParams?.lesson_time_after ?? "",
        },
        score: 0,
        studentComment: "",
        basicTags: "",
        normalTags: "",
        personalTags: "",
      });

      const transformed = transformSessionAction(raw);
      if (args.text === true) return textResult(formatSessionAction(transformed));
      return jsonResult({ sessionId, ...transformed });
    },
  );
}
