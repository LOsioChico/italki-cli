import { defineCommand } from "citty";
import { submitSessionAction, getSessionDetail } from "../services/booking";
import { transformSessionAction } from "../transforms/booking";
import { formatSessionAction } from "../presenters/booking";
import { readConfig } from "../services/config";
import { red, dim } from "../lib/color";
import type { ActionListItem } from "../schemas/booking";

export default defineCommand({
  meta: { description: "Cancel a lesson" },
  args: {
    session: { type: "string", description: "Session/lesson ID (required)", required: true },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const sessionId = Number(ctx.args.session);
    const useJson = ctx.args.json === true;

    // Fetch session detail to get action_list — cancel action varies by session state
    const detail = await getSessionDetail(config, sessionId);
    const actionList = detail.data?.action_list ?? [];
    const sessionObj = detail.data?.session_obj;
    const currentStatus = sessionObj?.status ?? "6";
    // last_operate_time is in session_obj, NOT at data level (verified from HAR)
    const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

    // Find cancel action — two variants:
    //   student_cancel_after_deduct (TP140) — cancel after teacher accepted (status 6)
    //   student_cancel_reschedule_request (CO301) — cancel a pending reschedule (status 5)
    const cancelAction: ActionListItem | undefined =
      actionList.find((a) => a.action === "student_cancel_after_deduct") ??
      actionList.find((a) => a.action === "student_cancel_reschedule_request");

    if (!cancelAction) {
      console.error(red("No cancel action available for this session."));
      console.error(dim(`Available actions: ${actionList.map((a) => a.action).join(", ") || "none"}`));
      process.exit(1);
    }

    const extraParams = cancelAction.extra_params;
    const needOtherParams = cancelAction.need_other_params ?? 0;
    const raw = await submitSessionAction(config, sessionId, {
      status: currentStatus,
      action: cancelAction.action,
      needOtherParams,
      lastOperateTime,
      extraParams: {
        code: extraParams?.code ?? "TP140",
        primaryLevel: extraParams?.primary_level ?? 0,
        lessonTimeAfter: extraParams?.lesson_time_after ?? "",
      },
    });

    const transformed = transformSessionAction(raw);

    if (useJson) {
      console.log(JSON.stringify({ sessionId, ...transformed }, null, 2));
      return;
    }

    const lines = formatSessionAction(transformed);
    console.log(lines.join("\n"));
  },
});
