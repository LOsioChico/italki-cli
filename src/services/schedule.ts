import { API_BASE, API_HEADERS } from "../constants";
import { scheduleSchema, type ScheduleResponse } from "../schemas/schedule";

export async function getSchedule(id: number): Promise<ScheduleResponse> {
  const res = await fetch(`${API_BASE}/api/v2/teacher/${id}/schedule`, {
    headers: API_HEADERS,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return scheduleSchema.parse(await res.json());
}
