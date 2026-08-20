import type { TeacherProfileResult, CourseResult, PriceTier } from "../transforms/teacher";
import type { ScheduleResult } from "../transforms/schedule";
import { bold, dim, green, yellow, cyan } from "../lib/color";
import { wrapText } from "../lib/wrap";
import { timeAgo, formatDateTime, formatTimeOnly, timeUntil, formatDuration } from "../lib/time-ago";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPrice(dollars: number | null): string {
  return dollars != null ? `$${dollars.toFixed(2)}` : "?";
}

function formatPriceTiers(priceTiers: PriceTier[], showPackages: boolean): string[] {
  if (!priceTiers.length) return [];

  return priceTiers.map((p) => {
    const len = `${p.sessionLengthMinutes}min`;
    const standalone = green(formatPrice(p.sessionPrice));
    if (!showPackages) return `      ${dim(`${len}:`)} ${standalone}/session`;

    const pkgPerSession = green(formatPrice(p.packagePerSession));
    const pkgTotal = green(formatPrice(p.packagePrice));
    const discountStr = p.packageDiscount > 0
      ? dim(`  |  ${p.packageLength}-pack `) + pkgTotal + dim(` (${pkgPerSession}/session, save ${formatPrice(p.packageDiscount)}/session)`)
      : dim(`  |  ${p.packageLength}-pack `) + pkgTotal;
    return `      ${dim(`${len}:`)} ${standalone}/session${discountStr}`;
  });
}

function formatCourse(course: CourseResult, showPackages: boolean): string[] {
  const tags = course.tags.length
    ? dim(` [${course.tags.join(", ")}]`)
    : "";
  const sessionCount = course.sessionCount ? dim(`  |  ${course.sessionCount} sessions`) : "";
  const header = `    ${bold(course.title)}${tags}${sessionCount}`;

  const priceLines = course.priceTiers.length
    ? formatPriceTiers(course.priceTiers, showPackages)
    : course.sessionPrice != null
      ? [`      ${green(formatPrice(course.sessionPrice))}/session`]
      : [];

  return [header, ...priceLines];
}

function formatStats(profile: TeacherProfileResult): string[] {
  const stats = profile.stats;
  if (!stats) return [];

  const sessionStats = stats.recentSessions.length
    ? (() => {
        const recent = stats.recentSessions.slice(-3).map((st) => `${MONTHS[st.month] ?? `month ${st.month}`}: ${st.sessions}`).join(", ");
        return [`\n  ${bold("Recent sessions:")} ${recent}`];
      })()
    : [];

  const rateStats: string[] = [];
  if (stats.responseRates.length) {
    const rates = stats.responseRates.slice(-3).map((r) => `${Math.round(r * 100)}%`).join(" → ");
    rateStats.push(`  ${dim("Response rate:")} ${rates}`);
  }
  if (stats.attendanceRates.length) {
    const rates = stats.attendanceRates.slice(-3).map((r) => `${Math.round(r * 100)}%`).join(" → ");
    rateStats.push(`  ${dim("Attendance:")} ${rates}`);
  }

  const cancelPolicy = profile.cancelPolicy
    ? [`\n  ${bold("Cancel policy:")} ${profile.cancelPolicy}`]
    : [];

  const education = profile.education.length
    ? [`\n  ${bold("Education:")}`, ...profile.education.map((e) => {
        const parts = [e.institution, e.major].filter(Boolean);
        return `    ${parts.join(" — ") ?? "?"}`;
      })]
    : [];

  const certifications = profile.certifications.length
    ? [`\n  ${bold("Certifications:")}`, ...profile.certifications.map((c) => {
        const year = c.endYear ? dim(` (${c.endYear})`) : "";
        const parts = [c.certificate, c.institution].filter(Boolean);
        return `    ${parts.join(" — ") ?? "?"}${year}`;
      })]
    : [];

  const experience = profile.experience.length
    ? [`\n  ${bold("Experience:")}`, ...profile.experience.map((exp) => {
        const end = exp.isCurrent ? "present" : exp.endYear?.toString() ?? "";
        const years = exp.startYear ? `${exp.startYear}-${end}` : "?";
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
  profile: TeacherProfileResult,
  opts: { showPackages?: boolean; showCourses?: boolean; showStats?: boolean; timezone?: string } = {},
): string[] {
  const teacherType = profile.type === "pro" ? cyan("PRO") : dim("TUTOR");
  const rating = yellow(String(profile.rating ?? "?"));
  const sessions = profile.sessionCount;
  const students = profile.studentCount;

  // Header — online teachers don't need "last seen"; offline shows relative + exact time
  const status = profile.isOnline
    ? green("online")
    : profile.lastLogin
      ? dim(`last seen ${timeAgo(profile.lastLogin, opts.timezone)} (${exactTime(profile.lastLogin, opts.timezone)})`)
      : dim("offline");

  const header: string[] = [
    `${dim(`#${profile.id}`)}  ${bold(profile.name)} [${teacherType}]  (${status})`,
    dim(`  ${profile.country}${profile.city ? `, ${profile.city}` : ""}${profile.timezone ? `  |  ${profile.timezone}` : ""}`),
    `  ${dim("Rating:")} ${rating}  ${dim("|")}  ${dim("Sessions:")} ${sessions}  ${dim("|")}  ${dim("Students:")} ${students}`,
    dim(`  Profile: ${profile.profileUrl}`),
    ...(profile.introVideoUrl ? [dim(`  Intro video: ${profile.introVideoUrl}`)] : []),
  ];

  const signature = profile.shortSignature ? [`  ${profile.shortSignature}`] : [];

  // About
  const about = profile.about
    ? [`\n  ${bold("About:")}`, ...wrapText(profile.about, "    ")]
    : [];

  // Languages
  const teaches = profile.teaches.length ? profile.teaches.map((l) => `${l.language} (${l.level})`).join(", ") : null;
  const speaks = profile.speaks.length ? profile.speaks.map((l) => `${l.language} (${l.level})`).join(", ") : null;
  const languages: string[] = [
    ...(teaches ? [`  Teaches: ${teaches}`] : []),
    ...(speaks ? [`  Also speaks: ${speaks}`] : []),
  ];

  // Trial
  const trial = profile.trial
    ? [`  ${dim("Trial:")} ${green(formatPrice(profile.trial.price))} ${dim(`for ${profile.trial.lengthMinutes}min`)}${profile.trial.sessionCount != null ? dim(`  |  ${profile.trial.sessionCount} trials`) : ""}`]
    : [];

  // Features
  const featuresLine = profile.features.length > 0 ? [`  ${dim("Features:")} ${cyan(profile.features.join(", "))}`] : [];

  // Courses (opt-in)
  const courseLines: string[] = opts.showCourses
    ? (() => {
        if (profile.courses.length === 0) return [];
        return [
          `\n  ${bold(`Courses (${profile.courses.length}):`)}`,
          ...profile.courses.flatMap((course) => ["", ...formatCourse(course, opts.showPackages === true)]),
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

export function formatTeacherSchedule(schedule: ScheduleResult, timezone: string, teacherId?: number): string[] {
  const slots = schedule.freeSlots.slice(0, 3);
  if (slots.length === 0) return ["\n  No available slots in the next 7 days."];

  const totalLabel = formatDuration(schedule.totalFreeMinutes);

  const lines = slots.map((s) => {
    const start = formatDateTime(s.startTime, timezone);
    const end = formatTimeOnly(s.endTime, timezone);
    const rel = timeUntil(s.startTime, timezone);
    return `    ${start} – ${end} ${dim(`(${formatDuration(s.durationMinutes)}, ${rel})`)}`;
  });

  const more = schedule.freeSlots.length > 3
    ? dim(`  …and ${schedule.freeSlots.length - 3} more slots (${totalLabel} total). See all: italki schedule ${teacherId ?? ""}`.trim())
    : dim(`  ${totalLabel} total`);

  return [`\n  ${bold("Next available slots:")} ${dim(`(${timezone})`)}`, ...lines, more];
}
