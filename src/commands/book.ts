import { defineCommand } from "citty";
import { getTeacher } from "../services/teacher";
import { createOrder, payOrder } from "../services/booking";
import { readConfig } from "../services/config";
import { resolveCoursePrice, type ResolvedPrice } from "../transforms/teacher";
import { green, dim, bold } from "../lib/color";
import { formatDateTime } from "../lib/time-ago";

export default defineCommand({
  meta: { description: "Book a lesson with a teacher (trial, single, or package)" },
  args: {
    teacher: { type: "string", description: "Teacher ID (required)", required: true },
    time: { type: "string", description: "Lesson start time (ISO 8601, e.g. 2026-08-29T19:00:00Z)", required: true },
    type: { type: "string", description: "Session type: trial (default), single, package" },
    language: { type: "string", description: "Lesson language code (auto-detected from teacher profile if omitted)" },
    duration: { type: "string", description: "Lesson length in minutes (30/45/60/90). Resolves the matching course_price_id. Without it, the first price entry (usually 30min) is used." },
    "course-id": { type: "string", description: "Course ID — required with --duration when the teacher has multiple courses in the lesson language" },
    "course-price-id": { type: "string", description: "Explicit course_price_id (overrides --duration). Validated against the teacher's price list." },
    "im-type": { type: "string", description: "IM type: zoom (default), skype, teams" },
    "no-balance": { type: "boolean", description: "Skip credits, pay with other method" },
    "dry-run": { type: "boolean", description: "Show what would be booked without creating order" },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const teacherId = Number(ctx.args.teacher);
    const timeStart = ctx.args.time;
    const sessionType = (ctx.args.type ?? "trial") as "trial" | "single" | "package";
    const imType = (ctx.args["im-type"] ?? "zoom") as "zoom" | "skype" | "teams";
    const noBalance = ctx.args["no-balance"] === true;
    const dryRun = ctx.args["dry-run"] === true;
    const useJson = ctx.args.json === true;

    // Validate time
    const startDate = new Date(timeStart);
    if (isNaN(startDate.getTime())) {
      console.error(`Invalid time: ${timeStart}. Use ISO 8601 format.`);
      process.exit(1);
    }

    // Map session type to lesson_type number
    const lessonTypeMap = { trial: 3, single: 1, package: 2 } as const;
    const lessonType = lessonTypeMap[sessionType];
    if (!lessonType) {
      console.error(`Invalid type: ${sessionType}. Use: trial, single, package`);
      process.exit(1);
    }

    // Map im_type to API code
    const imTypeMap = { zoom: "Z", skype: "1", teams: "T" } as const;
    const imTypeCode = imTypeMap[imType];
    if (!imTypeCode) {
      console.error(`Invalid im-type: ${imType}. Use: zoom, skype, teams`);
      process.exit(1);
    }

    // Fetch teacher profile to get language + course_price_id
    const teacher = await getTeacher(teacherId);
    const teachLangs = teacher.data?.teacher_info?.teach_language ?? [];
    const language = ctx.args.language ?? teachLangs[0]?.language ?? "";
    if (!language) {
      console.error("Could not determine lesson language. Pass --language explicitly.");
      process.exit(1);
    }

    // Determine course_price_id
    let coursePriceId: number;
    let resolved: ResolvedPrice | null = null;
    if (sessionType === "trial") {
      coursePriceId = -1;
    } else {
      try {
        resolved = resolveCoursePrice(teacher, {
          language,
          courseId: ctx.args["course-id"] != null ? Number(ctx.args["course-id"]) : undefined,
          durationMinutes: ctx.args.duration != null ? Number(ctx.args.duration) : undefined,
          coursePriceId: ctx.args["course-price-id"] != null ? Number(ctx.args["course-price-id"]) : undefined,
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
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
      if (useJson) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(`${bold("Dry run — no order will be created")}\n`);
        console.log(`  Teacher:    ${summary.teacherName} (${teacherId})`);
        if (resolved) console.log(`  Class:      ${resolved.courseTitle} (${resolved.sessionLengthMinutes}min, $${resolved.sessionPrice})`);
        console.log(`  Language:   ${language}`);
        console.log(`  Type:       ${sessionType} (lesson_type=${lessonType})`);
        console.log(`  Time:       ${formatDateTime(timeStart, config.timezone_iana)}`);
        console.log(`  IM:         ${imType} (${imTypeCode})`);
        console.log(`  Price ID:   ${coursePriceId}`);
        console.log(`  Order type: ${orderType}`);
        console.log(`  Use credits: ${!noBalance}`);
        console.log(`\n  ${dim("Remove --dry-run to book for real.")}`);
      }
      return;
    }

    // Create order
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

    // Pay order
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

    if (useJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(green(`✓ Booked ${sessionType} lesson with ${summary.teacherName}`));
      if (resolved) console.log(`  ${dim("Class:")}      ${resolved.courseTitle} (${resolved.sessionLengthMinutes}min, $${resolved.sessionPrice})`);
      console.log(`  ${dim("Time:")}       ${formatDateTime(timeStart, config.timezone_iana)}`);
      console.log(`  ${dim("Language:")}   ${language}`);
      console.log(`  ${dim("Order ID:")}   ${order.order_management_id}`);
      if (sessionId) console.log(`  ${dim("Session ID:")} ${sessionId}`);
      console.log(`  ${dim("Credits:")}    ${noBalance ? "not used" : "used"}`);
    }
  },
});
