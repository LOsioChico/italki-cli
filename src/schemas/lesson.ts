import { z } from "zod";

// Verified from italki i18n map (Aug 15, 2026):
// group values: "completed", "upcoming", "pending", "expired"
// card_name codes: TS665="Completed", TS654="Upcoming", TS652="Expired", TS653="Declined", TS664="Lesson canceled", TS677="New request"
// session_label codes: TP752="Completed", TP757="Upcoming", TP755="Canceled", TP754="Currently live", TP751="Confirmation needed"
// im_type: single-letter code (e.g. "Z"). Mapping is server-side, not in JS bundle — do not assume.

const lessonItemSchema = z.looseObject({
  kind: z.string(),
  group: z.string(), // "completed", "upcoming", "pending", "expired"
  card_name: z.string(), // i18n code, e.g. "TS665" = "Completed"
  status: z.string(), // "F" = completed (verified). Other values TBD.
  session_type: z.string(), // not verified — display as raw value
  total_price: z.number(),
  language: z.string(),
  duration: z.number(), // 15-min units (2 = 30min)
  im_type: z.string(), // single-letter code, mapping server-side
  user_type: z.number(),
  operator_type: z.string(),
  last_operate_time: z.string(),
  course_obj: z.looseObject({
    course_id: z.number(),
    course_title: z.string(),
  }),
  opposite_user_info: z.looseObject({
    user_id: z.number(),
    nickname: z.string(),
    avatar_file_name: z.string().optional(),
  }),
  session_obj: z.looseObject({
    session_id: z.number(),
    session_start_time: z.string(),
    session_end_time: z.string(),
    session_tag: z.string().optional(),
    session_label: z.string().optional(),
  }),
  has_summary: z.number().optional(),
});

export const lessonsResponseSchema = z.object({
  meta: z.looseObject({ ver: z.string() }),
  data: z.array(lessonItemSchema),
  success: z.number(),
});

export type LessonItem = z.infer<typeof lessonItemSchema>;
export type LessonsResponse = z.infer<typeof lessonsResponseSchema>;
