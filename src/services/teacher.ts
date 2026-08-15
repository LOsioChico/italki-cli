import { API_BASE, API_HEADERS } from "../constants";
import { teacherProfileSchema, type TeacherProfile } from "../schemas/teacher";

export async function getTeacher(id: number): Promise<TeacherProfile> {
  const res = await fetch(`${API_BASE}/api/v2/teacher/${id}`, {
    headers: API_HEADERS,
  });

  if (!res.ok) {
    const body = await res.text();
    if (body.includes("ErrTeacherNotFound")) {
      throw new Error(`Teacher ${id} not found. Verify the ID from search results.`);
    }
    throw new Error(`API ${res.status}: ${body}`);
  }

  return teacherProfileSchema.parse(await res.json());
}
