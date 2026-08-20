import type { LessonItem } from "../schemas/lesson";

export interface LessonResult {
  group: string;
  status: string;
  totalPrice: number;
  language: string;
  durationMinutes: number;
  courseTitle: string;
  courseId: number;
  teacherId: number;
  teacherName: string;
  teacherAvatar: string | null;
  sessionStart: string;
  sessionEnd: string;
  sessionLabel: string | null;
  hasSummary: boolean;
}

export function transformLessons(raw: LessonItem[]): LessonResult[] {
  return raw.map((l) => ({
    group: l.group,
    status: l.status,
    totalPrice: l.total_price / 100,
    language: l.language,
    durationMinutes: l.duration * 15,
    courseTitle: l.course_obj?.course_title ?? "",
    courseId: l.course_obj?.course_id ?? 0,
    teacherId: l.opposite_user_info?.user_id ?? 0,
    teacherName: l.opposite_user_info?.nickname ?? "",
    teacherAvatar: l.opposite_user_info?.avatar_file_name ?? null,
    sessionStart: l.session_obj?.session_start_time ?? "",
    sessionEnd: l.session_obj?.session_end_time ?? "",
    sessionLabel: l.session_obj?.session_tag ?? null,
    hasSummary: l.has_summary === 1,
  }));
}
