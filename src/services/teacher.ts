import { API_BASE, API_HEADERS } from "../constants";
import { authedFetch } from "../lib/auth";
import { teacherProfileSchema, type TeacherProfile } from "../schemas/teacher";
import type { Config } from "../schemas/config";

export async function getTeacher(id: number, config?: Config | null): Promise<TeacherProfile> {
  // Authed fetch personalizes data.student_info (trial_left_amount, already_has_trial).
  // Public fetch returns the anonymous viewer's student_info — ignore it there.
  const res = config?.i_token
    ? await authedFetch(`/api/v2/teacher/${id}`, config)
    : await fetch(`${API_BASE}/api/v2/teacher/${id}`, { headers: API_HEADERS });

  if (!res.ok) {
    const body = await res.text();
    if (body.includes("ErrTeacherNotFound")) {
      throw new Error(`Teacher ${id} not found. Verify the ID from search results.`);
    }
    throw new Error(`API ${res.status}: ${body}`);
  }

  return teacherProfileSchema.parse(await res.json());
}
