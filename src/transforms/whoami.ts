import type { Foundation, Analytics } from "../schemas/user";
import { LEVEL_MAP } from "../constants";

export interface LanguageLevel {
  language: string;
  level: string;
}

export interface AnalyticsResult {
  totalLessons: number;
  totalHours: number;
  longestStreak: number;
  weeklyLessons: number;
  weeklyHours: number;
  totalPractice: number;
}

export interface WhoamiResult {
  userId: number;
  nickname: string;
  email: string;
  timezone: string;
  isPremium: boolean;
  learningLanguages: LanguageLevel[];
  analytics: AnalyticsResult | null;
}

function toLevel(level: number | undefined): string {
  return level != null ? (LEVEL_MAP[level] ?? "?") : "?";
}

export function transformWhoami(foundation: Foundation, analytics: Analytics | null): WhoamiResult {
  const u = foundation.data?.user;
  if (!u) {
    return {
      userId: 0,
      nickname: "",
      email: "",
      timezone: "",
      isPremium: false,
      learningLanguages: [],
      analytics: null,
    };
  }

  const learningLangs = (foundation.data?.language_list ?? []).filter((l) => l.is_learning === 1);
  const learningLanguages = learningLangs.map((l) => ({
    language: l.language,
    level: toLevel(l.level),
  }));

  const analyticsResult: AnalyticsResult | null = analytics
    ? {
        totalLessons: analytics.total_lessons,
        totalHours: analytics.total_lessons_min / 60,
        longestStreak: analytics.longest_streak,
        weeklyLessons: analytics.weekly_lessons,
        weeklyHours: analytics.weekly_lessons_hours,
        totalPractice: analytics.total_practice,
      }
    : null;

  return {
    userId: u.user_id,
    nickname: u.nickname,
    email: u.email,
    timezone: u.timezone_iana,
    isPremium: u.is_premium === 1,
    learningLanguages,
    analytics: analyticsResult,
  };
}
