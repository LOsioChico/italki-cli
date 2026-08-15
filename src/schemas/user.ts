import { z } from "zod";

export const foundationSchema = z.looseObject({
  data: z.looseObject({
    user: z.looseObject({
      user_id: z.number(),
      nickname: z.string(),
      email: z.string(),
      timezone_iana: z.string(),
      is_premium: z.number(),
      learning_language: z.string(),
      locale: z.string().optional(),
      currency: z.string().optional(),
    }),
    language_list: z.array(z.looseObject({
      language: z.string(),
      level: z.number().optional(),
      is_learning: z.number(),
      is_teaching: z.number(),
    })).optional(),
  }),
  success: z.number(),
});

export type Foundation = z.infer<typeof foundationSchema>;

export const analyticsSchema = z.looseObject({
  week_streak: z.number(),
  longest_streak: z.number(),
  weekly_lessons: z.number(),
  weekly_lessons_hours: z.number(),
  total_lessons: z.number(),
  total_lessons_min: z.number(),
  total_practice: z.number(),
});

export type Analytics = z.infer<typeof analyticsSchema>;