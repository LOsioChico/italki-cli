import type { TimeChangeResponse, SessionActionResponse, SessionHistoryResponse, HistoryEntry } from "../schemas/booking";

export interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TimeChangeResult {
  minimumIntervalMinutes: number;
  freeSlots: FreeSlot[];
}

export interface SessionActionResult {
  success: boolean;
  nextStatus: string | null;
}

export interface HistoryItem {
  status: string;
  operator: string;
  code: string;
  time: string;
}

export interface SessionHistoryResult {
  history: HistoryItem[];
  isCompleted: boolean;
}

/** Transform time_change response into free slots (available minus booked). */
export function transformTimeChangeSlots(raw: TimeChangeResponse): TimeChangeResult {
  const available = raw.data.available_schedule ?? [];
  const booked = raw.data.teacher_lesson ?? [];

  const freeSlots: FreeSlot[] = [];
  for (const window of available) {
    const windowStart = new Date(window.start_time).getTime();
    const windowEnd = new Date(window.end_time).getTime();

    // Find booked sessions that overlap with this window
    const overlaps = booked
      .filter((b) => {
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();
        return bStart < windowEnd && bEnd > windowStart;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Subtract booked sessions from the window
    let cursor = windowStart;
    for (const bookedSlot of overlaps) {
      const bStart = new Date(bookedSlot.start_time).getTime();
      const bEnd = new Date(bookedSlot.end_time).getTime();
      if (bStart > cursor) {
        freeSlots.push({
          startTime: new Date(cursor).toISOString(),
          endTime: new Date(bStart).toISOString(),
          durationMinutes: Math.round((bStart - cursor) / 60000),
        });
      }
      cursor = Math.max(cursor, bEnd);
    }
    if (cursor < windowEnd) {
      freeSlots.push({
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(windowEnd).toISOString(),
        durationMinutes: Math.round((windowEnd - cursor) / 60000),
      });
    }
  }

  return {
    minimumIntervalMinutes: raw.data.minimum_request_time_interval ?? 0,
    freeSlots,
  };
}

/** Transform session action response. */
export function transformSessionAction(raw: SessionActionResponse): SessionActionResult {
  return {
    success: raw.data?.success === 1,
    nextStatus: raw.data?.next_status ?? null,
  };
}

/** Transform session history into readable timeline. */
export function transformSessionHistory(raw: SessionHistoryResponse): SessionHistoryResult {
  const history: HistoryItem[] = (raw.data?.history ?? []).map((entry: HistoryEntry) => ({
    status: entry.status,
    operator: entry.operator === 1 ? "student" : entry.operator === 2 ? "teacher" : "system",
    code: entry.code_params?.[0]?.code ?? "",
    time: entry.create_time,
  }));

  return {
    history,
    isCompleted: raw.data?.is_completed === 1,
  };
}
