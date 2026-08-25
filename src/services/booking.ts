import { authedFetch } from "../lib/auth";
import {
  createOrderResponseSchema,
  payOrderResponseSchema,
  timeChangeResponseSchema,
  sessionActionResponseSchema,
  sessionHistoryResponseSchema,
  sessionDetailResponseSchema,
  type CreateOrderResponse,
  type PayOrderResponse,
  type TimeChangeResponse,
  type SessionActionResponse,
  type SessionHistoryResponse,
  type SessionDetailResponse,
} from "../schemas/booking";
import type { Config } from "../schemas/config";

/** Create a booking order. Returns order_id. */
export async function createOrder(
  config: Config | null,
  params: {
    teacherId: number;
    language: string;
    lessonType: number; // 1=Single, 2=Package, 3=Trial, 4=Instant
    coursePriceId: number; // -1 for trial, real ID from price_list for regular
    timeStartList: string[]; // ISO 8601 UTC
    isInstant: boolean;
    lessonCount: number;
    imType: string; // "Z" for Zoom
    studentId: number;
    orderType: number; // 11 for trial
  },
): Promise<CreateOrderResponse> {
  const body = JSON.stringify({
    order_type: params.orderType,
    lesson_params: {
      teacher_id: params.teacherId,
      language: params.language,
      lesson_type: params.lessonType,
      course_price_id: params.coursePriceId,
      time_start_list: params.timeStartList,
      is_instant: params.isInstant,
      lesson_count: params.lessonCount,
      im_type: params.imType,
      student_id: params.studentId,
    },
  });
  const res = await authedFetch("/api/v3/orders", config, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create order failed (${res.status}): ${text}`);
  }
  return createOrderResponseSchema.parse(await res.json());
}

/** Pay for an order. noUseBalance: false = use credits, true = skip credits. */
export async function payOrder(
  config: Config | null,
  orderId: string,
  noUseBalance = false,
): Promise<PayOrderResponse> {
  const body = JSON.stringify({ no_use_balance: noUseBalance ? 1 : 0 });
  const res = await authedFetch(`/api/v3/orders/${orderId}/payment`, config, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Payment failed (${res.status}): ${text}`);
  }
  return payOrderResponseSchema.parse(await res.json());
}

/** Get available slots for rescheduling a session. */
export async function getTimeChangeSlots(
  config: Config | null,
  sessionId: number,
  startTime: string,
  endTime: string,
): Promise<TimeChangeResponse> {
  const start = encodeURIComponent(startTime);
  const end = encodeURIComponent(endTime);
  const res = await authedFetch(
    `/api/v2/session/${sessionId}/time_change?start_time=${start}&end_time=${end}`,
    config,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Time change slots failed (${res.status}): ${text}`);
  }
  return timeChangeResponseSchema.parse(await res.json());
}

/** Submit a session action (reschedule, cancel, etc.). */
export async function submitSessionAction(
  config: Config | null,
  sessionId: number,
  action: {
    status: string;
    action: string;
    needOtherParams: number;
    lastOperateTime: string;
    newSessionTime?: string;
    extraParams: { code: string; primaryLevel: number; lessonTimeAfter: string };
    pwdToken?: string;
  },
): Promise<SessionActionResponse> {
  const body = JSON.stringify({
    status: action.status,
    action: action.action,
    need_other_params: action.needOtherParams,
    last_operate_time: action.lastOperateTime,
    new_session_time: action.newSessionTime ?? "",
    extra_params: {
      code: action.extraParams.code,
      primary_level: action.extraParams.primaryLevel,
      lesson_time_after: action.extraParams.lessonTimeAfter,
    },
    pwd_token: action.pwdToken ?? "",
  });
  const res = await authedFetch(`/api/v2/session/${sessionId}`, config, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session action failed (${res.status}): ${text}`);
  }
  return sessionActionResponseSchema.parse(await res.json());
}

/** Get session history (status change timeline). */
export async function getSessionHistory(
  config: Config | null,
  sessionId: number,
): Promise<SessionHistoryResponse> {
  const res = await authedFetch(`/api/v2/session/${sessionId}/history`, config);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session history failed (${res.status}): ${text}`);
  }
  return sessionHistoryResponseSchema.parse(await res.json());
}

/** Get session detail (action_list, status, last_operate_time). Needed before submitting actions. */
export async function getSessionDetail(
  config: Config | null,
  sessionId: number,
): Promise<SessionDetailResponse> {
  const res = await authedFetch(`/api/v2/session/${sessionId}`, config);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session detail failed (${res.status}): ${text}`);
  }
  return sessionDetailResponseSchema.parse(await res.json());
}
