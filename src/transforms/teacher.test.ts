import { describe, expect, it } from "bun:test";
import { transformTeacher } from "./teacher";
import type { TeacherProfile } from "../schemas/teacher";

function makeProfile(overrides: Record<string, unknown> = {}): TeacherProfile {
  return {
    data: {
      user_info: {
        user_id: 123,
        nickname: "Jane",
        is_tutor: 0,
        is_pro: 1,
        origin_country_id: "US",
        ...overrides,
      },
      teacher_info: {
        overall_rating: "4.9",
        session_count: 500,
        student_count: 200,
        teach_language: [{ language: "english", level: 7 }],
        also_speak: [{ language: "spanish", level: 5 }],
        teacher_tag: [1, 2],
        personal_tag: ["friendly"],
        ...overrides,
      },
      course_info: {
        has_trial: 1,
        trial_price: 500,
        trial_length: 2,
        trial_session_count: 10,
        min_price: 1500,
        ...overrides,
      },
    },
  } as unknown as TeacherProfile;
}

describe("transformTeacher", () => {
  it("converts trial price from cents to dollars", () => {
    const result = transformTeacher(makeProfile());
    expect(result.trial?.price).toBe(5);
  });

  it("converts trial length from 15-min units to minutes", () => {
    const result = transformTeacher(makeProfile());
    expect(result.trial?.lengthMinutes).toBe(30);
  });

  it("maps language level numbers to CEFR names", () => {
    const result = transformTeacher(makeProfile());
    expect(result.teaches[0]!.level).toBe("Native");
    expect(result.speaks[0]!.level).toBe("C1");
  });

  it("converts min_price to priceFrom in dollars", () => {
    const result = transformTeacher(makeProfile());
    expect(result.priceFrom).toBe(15);
  });

  it("maps is_pro to type pro", () => {
    expect(transformTeacher(makeProfile()).type).toBe("pro");
  });

  it("maps is_tutor to type tutor", () => {
    const profile = makeProfile({ is_tutor: 1, is_pro: 0 });
    expect(transformTeacher(profile).type).toBe("tutor");
  });

  it("parses rating string to number", () => {
    expect(transformTeacher(makeProfile()).rating).toBe(4.9);
  });

  it("translates tag codes to names in courses", () => {
    const profile = makeProfile({});
    (profile.data as Record<string, unknown>)['pro_course_detail'] = [{
      id: 1,
      teacher_id: 123,
      language: "english",
      title: "Conversation",
      description: null,
      course_tags: ["T0090", "T0001"],
      session_price: 2000,
      has_package: 1,
      price_list: [{
        package_price: 18000,
        session_price: 2000,
        course_id: 1,
        package_length: 10,
        session_length: 4,
        course_price_id: 1,
      }],
    }];
    const result = transformTeacher(profile);
    expect(result.courses[0]!.tags).toEqual(["Programming/Coding", "Pronunciation"]);
  });

  it("converts price tier session_length to minutes", () => {
    const profile = makeProfile({});
    (profile.data as Record<string, unknown>)['pro_course_detail'] = [{
      id: 1,
      teacher_id: 123,
      language: "english",
      title: "Test",
      description: null,
      price_list: [{
        package_price: 18000,
        session_price: 2000,
        course_id: 1,
        package_length: 10,
        session_length: 4,
        course_price_id: 1,
      }],
    }];
    const result = transformTeacher(profile);
    expect(result.courses[0]!.priceTiers[0]!.sessionLengthMinutes).toBe(60);
  });

  it("marks end_year 2155 as current", () => {
    const profile = makeProfile({});
    (profile.data.teacher_info as Record<string, unknown>)['teaching_experience'] = [{
      start_year: 2020,
      end_year: 2155,
      institution: "School",
      position: "Teacher",
    }];
    const result = transformTeacher(profile);
    expect(result.experience[0]!.isCurrent).toBe(true);
  });

  it("generates profile URL", () => {
    expect(transformTeacher(makeProfile()).profileUrl).toBe("https://www.italki.com/en/teacher/123");
  });

  it("detects features from flags", () => {
    const profile = makeProfile({ instant_lesson_status: 1, recording_permission: 1 });
    const result = transformTeacher(profile);
    expect(result.features).toContain("instant lessons");
    expect(result.features).toContain("AI summaries");
  });

  it("handles null trial when has_trial is 0", () => {
    const profile = makeProfile({ has_trial: 0 });
    expect(transformTeacher(profile).trial).toBeNull();
  });
});
