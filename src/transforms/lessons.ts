import type { LessonItem } from "../schemas/lesson";
import { STATUS_MAP, SESSION_TYPE_MAP, IM_TYPE_MAP } from "../constants";

export interface LessonResult {
  group: string;
  status: string;
  statusLabel: string;
  sessionType: string;
  sessionTypeLabel: string;
  imType: string;
  imTypeLabel: string;
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
    statusLabel: STATUS_MAP[l.status] ?? l.status,
    sessionType: l.session_type,
    sessionTypeLabel: SESSION_TYPE_MAP[l.session_type] ?? l.session_type,
    imType: l.im_type,
    imTypeLabel: IM_TYPE_MAP[l.im_type] ?? l.im_type,
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
