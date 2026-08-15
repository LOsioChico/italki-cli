import { z } from "zod";
import type { TeacherTypeSlug, CategorySlug } from "../constants";

export const teacherInfoSchema = z.looseObject({
  user_id: z.number(),
  nickname: z.string(),
  avatar_file_name: z.string().optional(),
  is_tutor: z.number(),
  is_pro: z.number(),
  origin_country_id: z.string(),
  is_online: z.number().optional(),
  living_country_id: z.string().optional(),
});

export const courseInfoSchema = z.looseObject({
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  trial_price: z.number().optional(),
  has_trial: z.number().optional(),
});

export const searchTeacherInfoSchema = z.looseObject({
  overall_rating: z.string().optional(),
  session_count: z.number().optional(),
  student_count: z.number().optional(),
}).partial();

export const teacherSchema = z.looseObject({
  user_info: teacherInfoSchema,
  course_info: courseInfoSchema.optional(),
  teacher_info: searchTeacherInfoSchema.optional(),
  pro_course_detail: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const searchResponseSchema = z.looseObject({
  data: z.array(teacherSchema),
  paging: z.looseObject({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    has_next: z.number(),
  }),
  success: z.number(),
});

export type Teacher = z.infer<typeof teacherSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// User-facing filters — slugs, not API codes
export interface SearchFilters {
  language: string;
  teacherType?: TeacherTypeSlug | undefined;
  originCountry?: string[] | undefined;
  speaks?: string[] | undefined;
  maxPrice?: number | undefined;
  minPrice?: number | undefined;
  isNative?: boolean | undefined;
  category?: CategorySlug[] | undefined;
  tags?: string[] | undefined;
  hasTrial?: boolean | undefined;
  instant?: boolean | undefined;
  recording?: boolean | undefined;
  available72h?: boolean | undefined;
  weekday?: string[] | undefined; // e.g. ["mon", "tue", "wed"]
}
