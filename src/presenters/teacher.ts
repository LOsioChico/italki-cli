import type { TeacherProfile } from "../schemas/teacher";
import type { ScheduleResponse } from "../schemas/schedule";
import { formatPrice, TAG_NAMES, formatSessionLength, LEVEL_MAP } from "../constants";
import { bold, dim, green, yellow, cyan } from "../lib/color";
import { wrapText } from "../lib/wrap";
import { timeAgo, formatDateTime, formatTimeOnly, timeUntil, subtractBooked } from "../lib/time-ago";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Course = TeacherProfile["data"]["pro_course_detail"] extends (infer T)[] | undefined ? T : never;

function tagLabel(code: string): string {
  return TAG_NAMES[code as keyof typeof TAG_NAMES] ?? code;
}

function formatLanguages(langs: { language: string; level?: number | undefined }[] | undefined): string | null {
  if (!langs?.length) return null;
  return langs.map((l) => `${l.language} (${LEVEL_MAP[l.level ?? -1] ?? "?"})`).join(", ");
}

function formatPriceTiers(
  priceList: Course["price_list"],
  showPackages: boolean,
): string[] {
  if (!priceList?.length) return [];

  // Deduplicate by session_length, keep first entry
  const seen = new Set<number>();
  const tiers = priceList
    .filter((p) => {
      if (seen.has(p.session_length)) return false;
      seen.add(p.session_length);
      return true;
    })
    .sort((a, b) => a.session_length - b.session_length);

  return tiers.map((p) => {
    const len = formatSessionLength(p.session_length);
    const standalone = green(formatPrice(p.session_price));
    if (!showPackages) return `      ${dim(`${len}:`)} ${standalone}/session`;

    const pkgPerSession = green(formatPrice(p.package_price / p.package_length));
    const pkgTotal = green(formatPrice(p.package_price));
    const discount = p.session_price - p.package_price / p.package_length;
    const discountStr = discount > 0
      ? dim(`  |  ${p.package_length}-pack `) + pkgTotal + dim(` (${pkgPerSession}/session, save ${formatPrice(discount)}/session)`)
      : dim(`  |  ${p.package_length}-pack `) + pkgTotal;
    return `      ${dim(`${len}:`)} ${standalone}/session${discountStr}`;
  });
}

function formatCourse(course: Course, showPackages: boolean): string[] {
  const tags = course.course_tags?.length
    ? dim(` [${course.course_tags.map(tagLabel).join(", ")}]`)
    : "";
  const sessionCount = course.session_count != null ? dim(`  |  ${course.session_count} sessions`) : "";
  const header = `    ${bold(course.title)}${tags}${sessionCount}`;

  const priceLines = course.price_list?.length
    ? formatPriceTiers(course.price_list, showPackages)
    : course.session_price != null
      ? [`      ${green(formatPrice(course.session_price))}/session`]
      : [];

  return [header, ...priceLines];
}

function formatStats(profile: TeacherProfile): string[] {
  const d = profile.data;
  const t = d.teacher_info;
  const s = d.teacher_statistics;

  const sessionStats = s?.finished_session_list?.length
    ? (() => {
        const stats = s.finished_session_list!;
        const recent = stats.slice(-3).map((st) => `${MONTHS[st.month] ?? `month ${st.month}`}: ${st.data}`).join(", ");
        return [`\n  ${bold("Recent sessions:")} ${recent}`];
      })()
    : [];

  const rateStats: string[] = [];
  if (s?.response_rate_list?.length) {
    const rates = s.response_rate_list.slice(-3).map((r) => `${Math.round(r.data * 100)}%`).join(" → ");
    rateStats.push(`  ${dim("Response rate:")} ${rates}`);
  }
  if (s?.attendance_rate_list?.length) {
    const rates = s.attendance_rate_list.slice(-3).map((r) => `${Math.round(r.data * 100)}%`).join(" → ");
    rateStats.push(`  ${dim("Attendance:")} ${rates}`);
  }

  const cancelPolicy = t.cancel_policy
    ? [`\n  ${bold("Cancel policy:")} ${t.cancel_policy}`]
    : [];

  const education = t.edu_info?.length
    ? [`\n  ${bold("Education:")}`, ...t.edu_info.map((e) => {
        const parts = [e.institution, e.major].filter(Boolean);
        return `    ${parts.join(" — ") ?? "?"}`;
      })]
    : [];

  const certifications = t.cert_info?.length
    ? [`\n  ${bold("Certifications:")}`, ...t.cert_info.map((c) => {
        const year = c.end_year ? dim(` (${c.end_year})`) : "";
        const parts = [c.certificate, c.institution].filter(Boolean);
        return `    ${parts.join(" — ") ?? "?"}${year}`;
      })]
    : [];

  const experience = t.teaching_experience?.length
    ? [`\n  ${bold("Experience:")}`, ...t.teaching_experience.map((exp) => {
        const end = exp.end_year === 2155 ? "present" : exp.end_year?.toString() ?? "";
        const years = exp.start_year ? `${exp.start_year}-${end}` : "?";
        const parts = [exp.position, exp.institution].filter(Boolean);
        return `    ${dim(years)}  ${parts.join(" — ") ?? "?"}`;
      })]
    : [];

  return [...sessionStats, ...rateStats, ...cancelPolicy, ...education, ...certifications, ...experience];
}

function exactTime(iso: string, timezone: string | undefined): string {
  return formatDateTime(iso, timezone, { showYear: false });
}

export function formatTeacher(
  profile: TeacherProfile,
  opts: { showPackages?: boolean; showCourses?: boolean; showStats?: boolean; timezone?: string } = {},
): string[] {
  const d = profile.data;
  const u = d.user_info;
  const t = d.teacher_info;
  const c = d.course_info;

  const teacherType = u.is_pro ? cyan("PRO") : dim("TUTOR");
  const rating = yellow(String(t.overall_rating ?? "?"));
  const sessions = t.session_count ?? 0;
  const students = t.student_count ?? 0;

  // Header — online teachers don't need "last seen"; offline shows relative + exact time
  const status = u.is_online
    ? green("online")
    : u.last_login_time
      ? dim(`last seen ${timeAgo(u.last_login_time)} (${exactTime(u.last_login_time, opts.timezone)})`)
      : dim("offline");

  const header: string[] = [
    `${dim(`#${u.user_id}`)}  ${bold(u.nickname)} [${teacherType}]  (${status})`,
    dim(`  ${u.origin_country_id}${u.origin_city_name ? `, ${u.origin_city_name}` : ""}${u.timezone ? `  |  ${u.timezone}` : ""}`),
    `  ${dim("Rating:")} ${rating}  ${dim("|")}  ${dim("Sessions:")} ${sessions}  ${dim("|")}  ${dim("Students:")} ${students}`,
    dim(`  Profile: https://www.italki.com/en/teacher/${u.user_id}`),
    ...(t.video_url ? [dim(`  Intro video: ${t.video_url}`)] : []),
  ];

  const signature = t.short_signature ? [`  ${t.short_signature}`] : [];

  // About
  const about = t.about_me
    ? [`\n  ${bold("About:")}`, ...wrapText(t.about_me, "    ")]
    : [];

  // Languages
  const teaches = formatLanguages(t.teach_language);
  const speaks = formatLanguages(t.also_speak);
  const languages: string[] = [
    ...(teaches ? [`  Teaches: ${teaches}`] : []),
    ...(speaks ? [`  Also speaks: ${speaks}`] : []),
  ];

  // Trial
  const trial = c?.has_trial && c.trial_price != null
    ? [`  ${dim("Trial:")} ${green(formatPrice(c.trial_price))} ${dim(`for ${formatSessionLength(c.trial_length)}`)}${c.trial_session_count != null ? dim(`  |  ${c.trial_session_count} trials`) : ""}`]
    : [];

  // Features
  const features: string[] = [
    ...(t.instant_lesson_status ? ["instant lessons"] : []),
    ...(t.recording_permission ? ["AI summaries"] : []),
  ];
  const featuresLine = features.length > 0 ? [`  ${dim("Features:")} ${cyan(features.join(", "))}`] : [];

  // Courses (opt-in)
  const courseLines: string[] = opts.showCourses
    ? (() => {
        const courses = [...(d.pro_course_detail ?? []), ...(d.tutor_course_detail ?? [])];
        if (courses.length === 0) return [];
        return [
          `\n  ${bold(`Courses (${courses.length}):`)}`,
          ...courses.flatMap((course) => ["", ...formatCourse(course, opts.showPackages === true)]),
        ];
      })()
    : [];

  // Stats (opt-in)
  const statLines = opts.showStats ? formatStats(profile) : [];

  return [
    ...header,
    ...signature,
    ...about,
    ...languages,
    ...trial,
    ...featuresLine,
    ...courseLines,
    ...statLines,
  ];
}

export function formatTeacherSchedule(schedule: ScheduleResponse, timezone: string, teacherId?: number): string[] {
  // Subtract booked sessions from available slots, filter < 30 min
  const all = subtractBooked(schedule.data.available_schedule, schedule.data.teacher_lesson);
  const slots = all.slice(0, 3);
  if (slots.length === 0) return ["\n  No available slots in the next 7 days."];

  const totalHours = all.reduce((sum, s) => sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60), 0);
  const totalLabel = totalHours % 1 === 0 ? `${totalHours}h` : `${totalHours.toFixed(1)}h`;

  const lines = slots.map((s) => {
    const start = formatDateTime(s.start_time, timezone);
    const end = formatTimeOnly(s.end_time, timezone);
    const rel = timeUntil(s.start_time);
    const dur = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
    const durLabel = dur >= 1 ? `${Math.round(dur * 10) / 10}h` : `${Math.round(dur * 60)}min`;
    return `    ${start} – ${end} ${dim(`(${durLabel}, ${rel})`)}`;
  });

  const more = all.length > 3
    ? dim(`  …and ${all.length - 3} more slots (${totalLabel} total). See all: italki schedule ${teacherId ?? ""}`.trim())
    : dim(`  ${totalLabel} total`);

  return [`\n  ${bold("Next available slots:")} ${dim(`(${timezone})`)}`, ...lines, more];
}
