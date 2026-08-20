import { describe, expect, it } from "bun:test";
import { transformWhoami } from "./whoami";
import type { Foundation, Analytics } from "../schemas/user";

describe("transformWhoami", () => {
  it("maps language levels to CEFR names", () => {
    const foundation: Foundation = {
      data: {
        user: { user_id: 1, nickname: "Luis", email: "l@test.com", timezone_iana: "America/Bogota", is_premium: 1, learning_language: "english" },
        language_list: [
          { language: "english", level: 4, is_learning: 1, is_teaching: 0 },
          { language: "spanish", level: 7, is_learning: 1, is_teaching: 0 },
        ],
      },
      success: 1,
    };
    const result = transformWhoami(foundation, null);
    expect(result.learningLanguages[0]!.level).toBe("B2");
    expect(result.learningLanguages[1]!.level).toBe("Native");
  });

  it("filters to learning languages only", () => {
    const foundation: Foundation = {
      data: {
        user: { user_id: 1, nickname: "T", email: "t@t.com", timezone_iana: "UTC", is_premium: 0, learning_language: "english" },
        language_list: [
          { language: "english", level: 3, is_learning: 1, is_teaching: 0 },
          { language: "french", level: 5, is_learning: 0, is_teaching: 1 },
        ],
      },
      success: 1,
    };
    const result = transformWhoami(foundation, null);
    expect(result.learningLanguages).toHaveLength(1);
    expect(result.learningLanguages[0]!.language).toBe("english");
  });

  it("converts total_lessons_min to hours", () => {
    const foundation: Foundation = {
      data: {
        user: { user_id: 1, nickname: "T", email: "t@t.com", timezone_iana: "UTC", is_premium: 0, learning_language: "english" },
      },
      success: 1,
    };
    const analytics: Analytics = {
      week_streak: 5,
      longest_streak: 20,
      weekly_lessons: 3,
      weekly_lessons_hours: 2.5,
      total_lessons: 100,
      total_lessons_min: 6000,
      total_practice: 50,
    };
    const result = transformWhoami(foundation, analytics);
    expect(result.analytics?.totalHours).toBe(100);
  });

  it("maps is_premium to boolean", () => {
    const foundation: Foundation = {
      data: {
        user: { user_id: 1, nickname: "T", email: "t@t.com", timezone_iana: "UTC", is_premium: 1, learning_language: "english" },
      },
      success: 1,
    };
    expect(transformWhoami(foundation, null).isPremium).toBe(true);
  });

  it("handles null analytics", () => {
    const foundation: Foundation = {
      data: {
        user: { user_id: 1, nickname: "T", email: "t@t.com", timezone_iana: "UTC", is_premium: 0, learning_language: "english" },
      },
      success: 1,
    };
    expect(transformWhoami(foundation, null).analytics).toBeNull();
  });
});
