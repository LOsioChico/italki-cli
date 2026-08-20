// Verified API constants — all values tested Aug 2026
// See docs/api-reference.md for full verification details

export const API_BASE = "https://api.italki.com";
export const API_HEADERS = {
  "content-type": "application/json",
  origin: "https://www.italki.com",
  "user-agent": "Mozilla/5.0",
} as const;

export const DEFAULT_PAGE_SIZE = 99; // max 99 (100 returns only 20, >100 errors)
export const DEFAULT_TIMEZONE = "America/Bogota";

// Course categories — user-facing names map to API codes
export const CATEGORIES = {
  "language-essentials": "CA001",
  "business": "CA002",
  "test-preparation": "CA003",
  "kids": "CA004",
  "conversation": "CA005",
  "medical": "CA067",
  "technology": "CA068",
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

// Teacher type — user types "pro" or "tutor", API gets 1 or 2
export const TEACHER_TYPE_MAP = {
  pro: 1,
  tutor: 2,
} as const;

export type TeacherTypeSlug = keyof typeof TEACHER_TYPE_MAP;

// Weekday names — user types "mon,tue", API gets [1,2]
export const WEEKDAY_MAP = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
} as const;

// Course tags — 95 valid T codes + MHP kids tags (names verified against italki JS translation map)
// T0061-T0063 don't exist in the JS map (return 0). T0084="All" is a meta-tag (excluded).
export const TAG_NAMES = {
  T0001: "Pronunciation", T0002: "Grammar", T0003: "Spelling", T0004: "Reading",
  T0005: "Listening", T0006: "Writing", T0083: "Speaking",
  T0007: "Meeting", T0008: "Presentation", T0009: "Job Interview", T0010: "Negotiation", T0011: "Business Etiquette",
  T0012: "Industry Terminology", T0013: "Aerospace", T0014: "Accountancy", T0015: "Administration",
  T0016: "Agriculture", T0017: "Automotive", T0018: "Banking", T0019: "Charity",
  T0020: "Construction", T0021: "Consultancy", T0022: "Customer Service", T0023: "Digital",
  T0024: "Energy", T0025: "Education", T0026: "Engineering", T0027: "Entertainment",
  T0028: "Finance", T0029: "Government", T0030: "Human Resources", T0031: "Hospitality",
  T0032: "IT", T0033: "Insurance", T0034: "Legal Management", T0035: "Manufacturing",
  T0036: "Marketing", T0037: "Media", T0038: "Medical & Health", T0039: "Property",
  T0040: "Purchasing", T0041: "Retail", T0042: "Sales", T0043: "Science",
  T0044: "Security", T0045: "Technology", T0046: "Telecommunications", T0047: "Tourism",
  T0048: "Trade", T0049: "Transportation",
  T0050: "IELTS", T0051: "TOEFL", T0052: "TOEIC", T0053: "FCE",
  T0054: "BEC", T0055: "PET", T0056: "CAE", T0057: "CPE",
  T0058: "KET", T0059: "ILEC", T0060: "HSK", T0082: "Duolingo English Test",
  T0064: "DELF", T0065: "TELC", T0066: "DELE", T0067: "CELU",
  T0068: "CILS", T0069: "CELI", T0070: "JLPT", T0071: "EJU",
  T0072: "KLPT", T0073: "TOPIK", T0074: "TORFL", T0075: "ALPT",
  T0076: "DSH", T0077: "TestDaF", T0078: "CELPE-Bras", T0079: "CAPLE",
  T0080: "TCF", T0081: "TEF",
  T0094: "OET", T0095: "PLIDA", T0096: "CELPIP", T0097: "Goethe", T0098: "ÖSD", T0099: "TELC",
  T0085: "Medicine", T0086: "Dentistry", T0087: "Healthcare", T0088: "Health", T0089: "Fitness",
  T0090: "Programming/Coding", T0091: "Data Science", T0092: "Computer Science", T0093: "Product Development",
  MHP111: "3-6 years", MHP112: "7-12 years", MHP113: "13-15 years", MHP114: "16+ years",
} as const;

// Language level mapping (1-7, used by teacher profiles and user foundation)
export const LEVEL_MAP: Record<number, string> = {
  1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2", 7: "Native",
};
