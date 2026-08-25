import { defineCommand } from "citty";
import { getTimeChangeSlots, submitSessionAction, getSessionDetail } from "../services/booking";
import { transformTimeChangeSlots, transformSessionAction } from "../transforms/booking";
import { formatTimeChangeSlots, formatSessionAction } from "../presenters/booking";
import { readConfig, resolveTimezone } from "../services/config";
import { DEFAULT_TIMEZONE } from "../constants";
import { dim, red } from "../lib/color";
import type { ActionListItem } from "../schemas/booking";

export default defineCommand({
  meta: { description: "Reschedule a lesson — view available slots or move to a new time" },
  args: {
    session: { type: "string", description: "Session/lesson ID (required)", required: true },
    time: { type: "string", description: "New lesson time (ISO 8601). If omitted, shows available slots." },
    days: { type: "string", description: "Days to search ahead for slots (default: 28)" },
    timezone: { type: "string", description: "IANA timezone for slot display (default: from config)" },
    json: { type: "boolean", description: "Output as JSON" },
  },
  run: async (ctx) => {
    const config = await readConfig();
    if (!config) {
      console.error("Not logged in. Run 'italki login' first.");
      process.exit(1);
    }

    const sessionId = Number(ctx.args.session);
    const tz = resolveTimezone(ctx.args.timezone, config, DEFAULT_TIMEZONE);
    const days = Number(ctx.args.days ?? 28);
    const useJson = ctx.args.json === true;

    // Compute date range for slot search
    // HAR shows full ISO (2026-08-23T05:00:00Z = midnight Bogota), but schedule endpoint
    // accepts date-only (YYYY-MM-DD) and works. Using date-only for consistency.
    const now = new Date();
    const startStr = now.toLocaleDateString("en-CA", { timeZone: tz });
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const endStr = endDate.toLocaleDateString("en-CA", { timeZone: tz });

    if (!ctx.args.time) {
      // Show available slots
      const raw = await getTimeChangeSlots(config, sessionId, startStr, endStr);
      const transformed = transformTimeChangeSlots(raw);

      if (useJson) {
        console.log(JSON.stringify(transformed, null, 2));
        return;
      }

      const lines = formatTimeChangeSlots(transformed, tz);
      console.log(`${dim("Available slots for reschedule (next " + days + " days):")}\n`);
      console.log(lines.join("\n"));
      console.log(`\n${dim("To reschedule: italki reschedule --session " + sessionId + " --time <ISO>")}`);
      return;
    }

    // Reschedule to new time — fetch session detail first to get action_list
    const newTime = ctx.args.time;
    const newDate = new Date(newTime);
    if (isNaN(newDate.getTime())) {
      console.error(`Invalid time: ${newTime}. Use ISO 8601 format.`);
      process.exit(1);
    }

    const detail = await getSessionDetail(config, sessionId);
    const actionList = detail.data?.action_list ?? [];
    const sessionObj = detail.data?.session_obj;
    const currentStatus = sessionObj?.status ?? "6";
    // last_operate_time is in session_obj, NOT at data level (verified from HAR)
    const lastOperateTime = sessionObj?.last_operate_time ?? new Date().toISOString();

    // Find the reschedule action — two variants depending on session state:
    //   student_change_time_after_deduct (TS106) — status 6 → 5 (after teacher accepted)
    //   student_change_time_again (TS106) — status 5 → 5 (during pending reschedule)
    const rescheduleAction: ActionListItem | undefined =
      actionList.find((a) => a.action === "student_change_time_after_deduct") ??
      actionList.find((a) => a.action === "student_change_time_again");

    if (!rescheduleAction) {
      console.error(red("No reschedule action available for this session."));
      console.error(dim(`Available actions: ${actionList.map((a) => a.action).join(", ") || "none"}`));
      process.exit(1);
    }

    // Use values from the action_list item — these are session-specific
    const extraParams = rescheduleAction.extra_params;
    const needOtherParams = rescheduleAction.need_other_params ?? 1;
    const raw = await submitSessionAction(config, sessionId, {
      status: currentStatus,
      action: rescheduleAction.action,
      needOtherParams,
      lastOperateTime,
      newSessionTime: newTime,
      extraParams: {
        code: extraParams?.code ?? "TS106",
        primaryLevel: extraParams?.primary_level ?? 0,
        lessonTimeAfter: extraParams?.lesson_time_after ?? "",
      },
    });

    const transformed = transformSessionAction(raw);

    if (useJson) {
      console.log(JSON.stringify({ sessionId, newTime, ...transformed }, null, 2));
      return;
    }

    const lines = formatSessionAction(transformed);
    console.log(lines.join("\n"));
  },
});
