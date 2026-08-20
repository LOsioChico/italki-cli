import type { TeacherProfile, CourseDetail } from "../schemas/teacher";
import { TAG_NAMES, LEVEL_MAP } from "../constants";

export interface LanguageLevel {
  language: string;
  level: string;
}

export interface PriceTier {
  sessionLengthMinutes: number;
  sessionPrice: number;
  packageLength: number;
  packagePrice: number;
  packagePerSession: number;
  packageDiscount: number;
}

export interface CourseResult {
  id: number;
  title: string;
  description: string | null;
  language: string;
  tags: string[];
  sessionPrice: number | null;
  sessionCount: number;
  studentCount: number;
  hasPackage: boolean;
  priceTiers: PriceTier[];
}

export interface EducationItem {
  institution: string | null;
  major: string | null;
  level: number | null;
  description: string | null;
}

export interface CertItem {
  institution: string | null;
  certificate: string | null;
  endYear: number | null;
  status: number | null;
}

export interface ExperienceItem {
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  institution: string | null;
  position: string | null;
  institutionType: string | null;
  country: string | null;
}

export interface TeacherStats {
  recentSessions: Array<{ month: number; sessions: number }>;
  responseRates: number[];
  attendanceRates: number[];
}

export interface TrialInfo {
  price: number;
  lengthMinutes: number;
  sessionCount: number | null;
  description: string | null;
}

export interface TeacherProfileResult {
  id: number;
  name: string;
  type: "pro" | "tutor";
  country: string;
  city: string | null;
  livingCountry: string | null;
  livingCity: string | null;
  timezone: string | null;
  isOnline: boolean;
  lastLogin: string | null;
  profileUrl: string;
  introVideoUrl: string | null;
  shortSignature: string | null;
  about: string | null;
  teachingStyle: string | null;
  teaches: LanguageLevel[];
  speaks: LanguageLevel[];
  rating: number | null;
  proRating: number | null;
  tutorRating: number | null;
  sessionCount: number;
  studentCount: number;
  trial: TrialInfo | null;
  priceFrom: number | null;
  hasBeginnerCourse: boolean;
  features: string[];
  cancelPolicy: string | null;
  personalTags: string[];
  teacherTags: number[];
  courses: CourseResult[];
  stats: TeacherStats | null;
  education: EducationItem[];
  certifications: CertItem[];
  experience: ExperienceItem[];
  availableTime90d: string | null;
}

function toDollars(cents: number | undefined | null): number | null {
  return cents != null ? cents / 100 : null;
}

function toLevel(level: number | undefined): string {
  return level != null ? (LEVEL_MAP[level] ?? "?") : "?";
}

function transformLanguages(
  langs: { language: string; level?: number | undefined }[] | undefined,
): LanguageLevel[] {
  if (!langs?.length) return [];
  return langs.map((l) => ({ language: l.language, level: toLevel(l.level) }));
}

function transformTag(code: string): string {
  return TAG_NAMES[code as keyof typeof TAG_NAMES] ?? code;
}

function transformPriceTiers(
  priceList: CourseDetail["price_list"],
): PriceTier[] {
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
    const perSession = p.package_price / p.package_length;
    const discount = p.session_price - perSession;
    return {
      sessionLengthMinutes: p.session_length * 15,
      sessionPrice: p.session_price / 100,
      packageLength: p.package_length,
      packagePrice: p.package_price / 100,
      packagePerSession: perSession / 100,
      packageDiscount: discount / 100,
    };
  });
}

function transformCourse(course: CourseDetail): CourseResult {
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? null,
    language: course.language,
    tags: (course.course_tags ?? []).map(transformTag),
    sessionPrice: toDollars(course.session_price),
    sessionCount: course.session_count ?? 0,
    studentCount: course.student_count ?? 0,
    hasPackage: course.has_package === 1,
    priceTiers: transformPriceTiers(course.price_list),
  };
}

function parseRating(rating: string | undefined): number | null {
  return rating != null && Number(rating) > 0 ? Number(rating) : null;
}

export function transformTeacher(raw: TeacherProfile): TeacherProfileResult {
  const d = raw.data;
  const u = d.user_info;
  const t = d.teacher_info;
  const c = d.course_info;
  const s = d.teacher_statistics;

  const courses = [
    ...(d.pro_course_detail ?? []),
    ...(d.tutor_course_detail ?? []),
  ].map(transformCourse);

  const features: string[] = [];
  if (t.instant_lesson_status) features.push("instant lessons");
  if (t.recording_permission) features.push("AI summaries");

  const trial: TrialInfo | null =
    c?.has_trial && c.trial_price != null
      ? {
          price: c.trial_price / 100,
          lengthMinutes: (c.trial_length ?? 0) * 15,
          sessionCount: c.trial_session_count ?? null,
          description: c.trial_description ?? null,
        }
      : null;

  const stats: TeacherStats | null = s
    ? {
        recentSessions: (s.finished_session_list ?? []).map((st) => ({
          month: st.month,
          sessions: st.data,
        })),
        responseRates: (s.response_rate_list ?? []).map((r) => r.data),
        attendanceRates: (s.attendance_rate_list ?? []).map((r) => r.data),
      }
    : null;

  const education: EducationItem[] = (t.edu_info ?? []).map((e) => ({
    institution: e.institution ?? null,
    major: e.major ?? null,
    level: e.level ?? null,
    description: e.description ?? null,
  }));

  const certifications: CertItem[] = (t.cert_info ?? []).map((c2) => ({
    institution: c2.institution ?? null,
    certificate: c2.certificate ?? null,
    endYear: c2.end_year ?? null,
    status: c2.status ?? null,
  }));

  const experience: ExperienceItem[] = (t.teaching_experience ?? []).map((exp) => ({
    startYear: exp.start_year ?? null,
    endYear: exp.end_year ?? null,
    isCurrent: exp.end_year === 2155,
    institution: exp.institution ?? null,
    position: exp.position ?? null,
    institutionType: exp.institution_type ?? null,
    country: exp.country ?? null,
  }));

  return {
    id: u.user_id,
    name: u.nickname,
    type: u.is_pro ? "pro" : "tutor",
    country: u.origin_country_id,
    city: u.origin_city_name ?? null,
    livingCountry: u.living_country_id ?? null,
    livingCity: u.living_city_name ?? null,
    timezone: u.timezone ?? null,
    isOnline: u.is_online === 1,
    lastLogin: u.last_login_time ?? null,
    profileUrl: `https://www.italki.com/en/teacher/${u.user_id}`,
    introVideoUrl: t.video_url ?? null,
    shortSignature: t.short_signature ?? null,
    about: t.about_me ?? null,
    teachingStyle: t.teaching_style ?? null,
    teaches: transformLanguages(t.teach_language),
    speaks: transformLanguages(t.also_speak),
    rating: parseRating(t.overall_rating),
    proRating: parseRating(t.pro_rating),
    tutorRating: parseRating(t.tutor_rating),
    sessionCount: t.session_count ?? 0,
    studentCount: t.student_count ?? 0,
    trial,
    priceFrom: toDollars(c?.min_price),
    hasBeginnerCourse: c?.has_beginner_course === 1,
    features,
    cancelPolicy: t.cancel_policy ?? null,
    personalTags: t.personal_tag ?? [],
    teacherTags: t.teacher_tag ?? [],
    courses,
    stats,
    education,
    certifications,
    experience,
    availableTime90d: t.available_time_90d ?? null,
  };
}
