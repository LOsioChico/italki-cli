import { describe, expect, it } from "bun:test";
import { transformTeacher, resolveCoursePrice } from "./teacher";
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

// Fixture mirrors Mansour's real shape (session_length in 15-min units, duplicate package variants).
function makeCourseProfile(): TeacherProfile {
  const priceEntry = (pid: number, units: number, cents: number) => ({
    course_price_id: pid,
    session_length: units,
    session_price: cents,
    package_length: 5,
    package_price: cents * 5,
    course_id: 0,
  });
  return {
    data: {
      user_info: { user_id: 1, nickname: "T", is_pro: 0, is_tutor: 1, origin_country_id: "DZ" },
      teacher_info: { teach_language: [{ language: "english", level: 7 }] },
      course_info: { has_trial: 1, trial_price: 600, trial_length: 2, trial_session_count: 283, min_price: 700 },
      pro_course_detail: [
        {
          id: 173811,
          teacher_id: 1,
          language: "english",
          title: "Conversation Class: Listening & Speaking - Pronunciation",
          description: null,
          price_list: [
            priceEntry(429484, 2, 700),
            priceEntry(429483, 4, 900),
          ],
        },
        {
          id: 255776,
          teacher_id: 1,
          language: "english",
          title: "Technology Class: Enthusiastic Listening & Speaking session",
          description: null,
          price_list: [
            priceEntry(686777, 2, 800),
            priceEntry(686776, 4, 1100),
          ],
        },
      ],
    },
  } as unknown as TeacherProfile;
}

describe("resolveCoursePrice", () => {
  it("resolves duration for a single-course teacher without course_id", () => {
    const profile = makeCourseProfile();
    profile.data["pro_course_detail"] = profile.data["pro_course_detail"]?.slice(0, 1);
    const r = resolveCoursePrice(profile, { language: "english", durationMinutes: 60 });
    expect(r.coursePriceId).toBe(429483);
    expect(r.sessionLengthMinutes).toBe(60);
    expect(r.sessionPrice).toBe(9);
  });

  it("errors when duration given but teacher has multiple courses and no course_id", () => {
    expect(() => resolveCoursePrice(makeCourseProfile(), { language: "english", durationMinutes: 60 }))
      .toThrow(/pass course_id/);
  });

  it("resolves course_id + duration combination", () => {
    const r = resolveCoursePrice(makeCourseProfile(), { language: "english", courseId: 255776, durationMinutes: 60 });
    expect(r.coursePriceId).toBe(686776);
    expect(r.courseTitle).toBe("Technology Class: Enthusiastic Listening & Speaking session");
    expect(r.sessionPrice).toBe(11);
  });

  it("errors listing offered durations when duration not available for the course", () => {
    expect(() => resolveCoursePrice(makeCourseProfile(), { language: "english", courseId: 255776, durationMinutes: 90 }))
      .toThrow(/no 90min option.*30min\/\$8.*60min\/\$11/);
  });

  it("errors listing course ids when course_id unknown", () => {
    expect(() => resolveCoursePrice(makeCourseProfile(), { language: "english", courseId: 999, durationMinutes: 60 }))
      .toThrow(/course_id 999 not found.*173811.*255776/);
  });

  it("validates explicit course_price_id and returns its course + duration", () => {
    const r = resolveCoursePrice(makeCourseProfile(), { language: "english", coursePriceId: 686776 });
    expect(r.courseId).toBe(255776);
    expect(r.sessionLengthMinutes).toBe(60);
    expect(r.sessionPrice).toBe(11);
  });

  it("errors with valid IDs when explicit course_price_id is not a price id", () => {
    expect(() => resolveCoursePrice(makeCourseProfile(), { language: "english", coursePriceId: 255776 }))
      .toThrow(/course_price_id 255776 not found.*429484.*686776/);
  });

  it("defaults to first price entry when neither duration nor pid given (legacy behavior)", () => {
    const profile = makeCourseProfile();
    profile.data["pro_course_detail"] = profile.data["pro_course_detail"]?.slice(0, 1);
    const r = resolveCoursePrice(profile, { language: "english" });
    expect(r.coursePriceId).toBe(429484);
    expect(r.sessionLengthMinutes).toBe(30);
  });

  it("errors when teacher has no courses in the lesson language", () => {
    expect(() => resolveCoursePrice(makeCourseProfile(), { language: "spanish", durationMinutes: 60 }))
      .toThrow(/No spanish courses/);
  });
});
