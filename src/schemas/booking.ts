import { z } from "zod";

// --- Create order (POST /v3/orders) ---
// Verified from HAR (www.italki-non-trial-flow.com.har, Aug 24):
// Response: {"order_management_id": "2203351374518667584"}

export const createOrderResponseSchema = z.looseObject({
  order_management_id: z.string(),
});

export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;

// --- Pay order (POST /v3/orders/{id}/payment) ---
// Verified from HAR (www.italki-non-trial-flow.com.har, Aug 24):
// Response includes full order details. session_id is in order_result.lesson_info.lesson_ids[0]
export const payOrderResponseSchema = z.looseObject({
  order_management_id: z.string().optional(),
  order_status: z.number().optional(),
  order_type: z.number().optional(),
  price: z.number().optional(),
  creator_id: z.number().optional(),
  owner_id: z.number().optional(),
  teacher_id: z.number().optional(),
  order_request: z.looseObject({
    lesson_info: z.looseObject({
      lesson_type: z.string().optional(),
      is_instant: z.number().optional(),
      lesson_count: z.number().optional(),
      lesson_duration: z.number().optional(),
      time_start_list: z.array(z.string()).optional(),
      im_type: z.string().optional(),
      course_price_id: z.number().optional(),
    }).optional(),
  }).optional(),
  order_result: z.looseObject({
    lesson_info: z.looseObject({
      lesson_ids: z.array(z.number()).optional(),
      package_id: z.number().optional(),
    }).optional(),
  }).optional(),
});

export type PayOrderResponse = z.infer<typeof payOrderResponseSchema>;

// --- Time change slots (GET /v2/session/{id}/time_change) ---

const timeSlotSchema = z.looseObject({
  start_time: z.string(),
  end_time: z.string(),
});

export const timeChangeResponseSchema = z.looseObject({
  meta: z.looseObject({ ver: z.string() }),
  data: z.looseObject({
    minimum_request_time_interval: z.number(),
    available_schedule: z.array(timeSlotSchema),
    teacher_lesson: z.array(timeSlotSchema),
  }),
  success: z.number(),
});

export type TimeChangeResponse = z.infer<typeof timeChangeResponseSchema>;

// --- Session action (POST /v2/session/{id}) ---

export const sessionActionResponseSchema = z.looseObject({
  meta: z.looseObject({ ver: z.string() }),
  data: z.looseObject({
    success: z.number(),
    pwd_token: z.string().optional(),
    next_status: z.string().optional(),
    show_trustpilot_invite: z.boolean().optional(),
    review_platform: z.unknown().optional(),
  }),
  success: z.number(),
});

export type SessionActionResponse = z.infer<typeof sessionActionResponseSchema>;

// --- Session detail (GET /v2/session/{id}) ---
// Returns action_list needed for reschedule/cancel actions.
// Verified from HAR 2 (www.italki2.com.har, Aug 22).

const actionListItemSchema = z.looseObject({
  action: z.string(),
  status: z.string(),
  need_other_params: z.number().optional(),
  last_operate_time: z.string().optional(),
  new_session_time: z.string().optional(),
  extra_params: z.looseObject({
    code: z.string(),
    primary_level: z.number().optional(),
    lesson_time_after: z.string().optional(),
  }).optional(),
});

export const sessionDetailResponseSchema = z.looseObject({
  meta: z.looseObject({ ver: z.string() }),
  data: z.looseObject({
    session_obj: z.looseObject({
      session_id: z.number(),
      status: z.string(),
      session_start_time: z.string(),
      session_end_time: z.string(),
      session_duration: z.number().optional(),
      session_price: z.number().optional(),
      session_tag: z.string().optional(),
      session_label: z.string().optional(),
      session_label_code: z.string().optional(),
      is_instant: z.number().optional(),
      last_operate_time: z.string().optional(),
      operate_deadline: z.string().optional(),
      new_session_start_time: z.string().optional(),
      new_session_end_time: z.string().optional(),
    }),
    action_list: z.array(actionListItemSchema).optional(),
  }),
  success: z.number(),
});

export type SessionDetailResponse = z.infer<typeof sessionDetailResponseSchema>;
export type ActionListItem = z.infer<typeof actionListItemSchema>;

// --- Session history (GET /v2/session/{id}/history) ---

const historyEntrySchema = z.looseObject({
  code_params: z.array(z.looseObject({ code: z.string(), param: z.unknown().optional() })),
  status: z.string(),
  operator: z.number(),
  create_time: z.string(),
  history_id: z.number(),
});

export const sessionHistoryResponseSchema = z.looseObject({
  meta: z.looseObject({ ver: z.string() }),
  data: z.looseObject({
    history: z.array(historyEntrySchema),
    is_completed: z.number(),
  }),
  success: z.number(),
});

export type SessionHistoryResponse = z.infer<typeof sessionHistoryResponseSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
