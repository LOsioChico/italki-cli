import { z } from "zod";

const languageLevelSchema = z.looseObject({
  language: z.string(),
  level: z.number().optional(),
});

const priceListSchema = z.looseObject({
  package_price: z.number(),
  session_price: z.number(),
  course_id: z.number(),
  package_length: z.number(),
  session_length: z.number(),
  course_price_id: z.number(),
});

const courseDetailSchema = z.looseObject({
  id: z.number(),
  teacher_id: z.number(),
  language: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  level_lower_limit: z.number().optional(),
  level_up_limit: z.number().optional(),
  course_category: z.string().optional(),
  course_tags: z.array(z.string()).optional(),
  session_price: z.number().optional(),
  student_count: z.number().optional(),
  session_count: z.number().optional(),
  has_package: z.number().optional(),
  price_list: z.array(priceListSchema).optional(),
});

export const teacherProfileSchema = z.looseObject({
  data: z.looseObject({
    user_info: z.looseObject({
      user_id: z.number(),
      nickname: z.string(),
      avatar_file_name: z.string().optional(),
      is_tutor: z.number(),
      is_pro: z.number(),
      origin_country_id: z.string(),
      origin_city_name: z.string().optional(),
      living_country_id: z.string().optional(),
      living_city_name: z.string().optional(),
      timezone: z.string().optional(),
      last_login_time: z.string().optional(),
      is_online: z.number().optional(),
    }),
    teacher_info: z.looseObject({
      intro: z.string().nullish(),
      short_signature: z.string().nullish(),
      teach_language: z.array(languageLevelSchema).optional(),
      also_speak: z.array(languageLevelSchema).optional(),
      overall_rating: z.string().optional(),
      pro_rating: z.string().optional(),
      tutor_rating: z.string().optional(),
      session_count: z.number().optional(),
      student_count: z.number().optional(),
      has_trial: z.number().optional(),
      free_trial: z.number().optional(),
      instant_lesson_status: z.number().optional(),
      recording_permission: z.number().optional(),
      available_time_90d: z.string().nullish(),
      cancel_policy: z.string().optional(),
      video_url: z.string().nullish(),
      about_me: z.string().nullish(),
      teaching_style: z.string().nullish(),
      teacher_tag: z.array(z.number()).optional(),
      personal_tag: z.array(z.string()).optional(),
      edu_info: z.array(z.looseObject({
        institution: z.string().optional(),
        major: z.string().optional(),
        level: z.number().optional(),
        description: z.string().optional(),
      }).partial()).optional(),
      cert_info: z.array(z.looseObject({
        institution: z.string().optional(),
        certificate: z.string().optional(),
        end_year: z.number().optional(),
        status: z.number().optional(),
      }).partial()).optional(),
      teaching_experience: z.array(z.looseObject({
        start_year: z.number().optional(),
        end_year: z.number().optional(),
        institution: z.string().optional(),
        position: z.string().optional(),
        institution_type: z.string().optional(),
        country: z.string().optional(),
      }).partial()).optional(),
    }).partial(),
    course_info: z.looseObject({
      trial_length: z.number().optional(),
      has_trial: z.number().optional(),
      trial_price: z.number().optional(),
      min_price: z.number().optional(),
      trial_session_count: z.number().optional(),
      trial_description: z.string().optional(),
      has_beginner_course: z.number().optional(),
    }).partial().optional(),
    pro_course_detail: z.array(courseDetailSchema).optional(),
    tutor_course_detail: z.array(courseDetailSchema).optional(),
    teacher_statistics: z.looseObject({
      finished_session_list: z.array(z.looseObject({ month: z.number(), data: z.number() })).optional(),
      response_rate_list: z.array(z.looseObject({ month: z.number(), data: z.number() })).optional(),
      attendance_rate_list: z.array(z.looseObject({ month: z.number(), data: z.number() })).optional(),
    }).partial().optional(),
  }),
});

export type TeacherProfile = z.infer<typeof teacherProfileSchema>;
export type CourseDetail = z.infer<typeof courseDetailSchema>;
