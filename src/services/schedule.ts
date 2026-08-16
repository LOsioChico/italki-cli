import { API_BASE, API_HEADERS } from "../constants";
import { scheduleSchema, type ScheduleResponse } from "../schemas/schedule";

export async function getSchedule(id: number, days = 28, timezone?: string): Promise<ScheduleResponse> {
  const now = new Date();
  // Compute start/end dates in the target timezone, not UTC.
  // A slot at 11 PM Bogota (4 AM UTC next day) would be missed if we use UTC dates.
  const startStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const endStr = endDate.toLocaleDateString("en-CA", { timeZone: timezone });

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
