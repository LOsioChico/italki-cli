import { defineCommand } from "citty";
import { submitSessionAction, getSessionDetail } from "../services/booking";
import { transformSessionAction } from "../transforms/booking";
import { formatSessionAction } from "../presenters/booking";
import { readConfig } from "../services/config";
import { red, dim } from "../lib/color";
import type { ActionListItem } from "../schemas/booking";

export default defineCommand({
  meta: { description: "Confirm a completed lesson (status 7 → F)" },
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

    const detail = await getSessionDetail(config, sessionId);
    const actionList = detail.data?.action_list ?? [];
    const sessionObj = detail.data?.session_obj;
    const currentStatus = sessionObj?.status ?? "7";
    const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

    const confirmAction: ActionListItem | undefined =
      actionList.find((a) => a.action === "student_complete_and_comment");

    if (!confirmAction) {
      console.error(red("No confirm action available for this session."));
      console.error(dim(`Available actions: ${actionList.map((a) => a.action).join(", ") || "none"}`));
      process.exit(1);
    }

    const extraParams = confirmAction.extra_params;
    const raw = await submitSessionAction(config, sessionId, {
      status: currentStatus,
      action: confirmAction.action,
      needOtherParams: confirmAction.need_other_params ?? 1,
      lastOperateTime,
      extraParams: {
        code: extraParams?.code ?? "LV001",
        primaryLevel: extraParams?.primary_level ?? 1,
        lessonTimeAfter: extraParams?.lesson_time_after ?? "",
      },
      score: 0,
      studentComment: "",
      basicTags: "",
      normalTags: "",
      personalTags: "",
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
