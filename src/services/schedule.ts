import { API_BASE, API_HEADERS } from "../constants";
import { scheduleSchema, type ScheduleResponse } from "../schemas/schedule";

export async function getSchedule(id: number, days = 28): Promise<ScheduleResponse> {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const startStr = now.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const res = await fetch(
    `${API_BASE}/api/v2/teacher/${id}/schedule?start_time=${startStr}&end_time=${endStr}`,
    { headers: API_HEADERS },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return scheduleSchema.parse(await res.json());
}
