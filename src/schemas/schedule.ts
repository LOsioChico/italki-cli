import { z } from "zod";

const timeSlotSchema = z.looseObject({
  start_time: z.string(),
  end_time: z.string(),
});

export const scheduleSchema = z.looseObject({
  meta: z.looseObject({
    performance: z.number(),
    server_time: z.number(),
    ver: z.string(),
  }),
  data: z.looseObject({
    minimum_request_time_interval: z.number(),
    available_schedule: z.array(timeSlotSchema),
    teacher_lesson: z.array(timeSlotSchema),
    student_group_class: z.array(timeSlotSchema),
    teacher_group_class: z.array(timeSlotSchema),
    student_lesson: z.array(timeSlotSchema),
    closest_available_datetime: z.string(),
  }),
  success: z.number(),
});

export type ScheduleResponse = z.infer<typeof scheduleSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
