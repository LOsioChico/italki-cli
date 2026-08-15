import { z } from "zod";

const reviewUserInfoSchema = z.looseObject({
  user_id: z.number(),
  nickname: z.string(),
  avatar_file_name: z.string().nullable().optional(),
  is_tutor: z.number(),
  is_pro: z.number(),
  origin_country_id: z.string(),
});

const commentInfoSchema = z.looseObject({
  comment_id: z.number(),
  session_id: z.number(),
  session_language: z.string(),
  content: z.string(),
  create_time: z.string(),
  is_reviews_up: z.boolean(),
});

const reviewSchema = z.looseObject({
  user_info: reviewUserInfoSchema,
  comment_info: commentInfoSchema,
  comment_count: z.number(),
  has_anonymous: z.number(),
  lesson_count: z.number(),
  allow_show: z.number(),
});

export const reviewsResponseSchema = z.looseObject({
  meta: z.looseObject({
    performance: z.number(),
    server_time: z.number(),
    ver: z.string(),
  }),
  data: z.looseObject({
    review_list: z.array(reviewSchema),
    comment_total: z.number(),
    top_total: z.number(),
  }),
  success: z.number(),
  paging: z.looseObject({
    has_next: z.number(),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
  }),
});

export type Review = z.infer<typeof reviewSchema>;
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>;
