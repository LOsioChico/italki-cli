# italki API Reference

> Reverse-engineered from public sources + direct testing. All endpoints verified Aug 14-15, 2026.
> Every field documented here was observed in actual API responses.
>
> This documents the **API surface**, not just what the CLI implements. Endpoints marked ✅
> are verified; not all have a corresponding CLI command or service yet. See `src/services/`
> for what's actually wired into the CLI.
>
> **Counts are a snapshot.** Teacher counts (e.g. "4278 English teachers", "794 with US filter")
> were accurate at verification time. The directory grows daily — treat them as order-of-magnitude
> references, not live facts. Re-curl if you need current numbers.

## Base URLs

| Domain | Purpose |
|---|---|
| `https://api.italki.com` | REST API (v2) — primary |
| `https://www.italki.com` | Website (Next.js frontend) |

## Common request headers

```
Content-Type: application/json
Accept: application/json, text/plain, */*
Origin: https://www.italki.com
Referer: https://www.italki.com/
User-Agent: Mozilla/5.0 (or any browser UA)
```

## Common response envelope

All endpoints return:

```json
{
  "meta": {
    "performance": 0,
    "server_time": 1786740007820,
    "ver": "2.2.0"
  },
  "data": { /* endpoint-specific */ },
  "success": 1,
  "paging": { /* list endpoints only */ }
}
```

On error:

```json
{
  "meta": { ... },
  "error": {
    "code": "NeedAuth",
    "text_code": "CO167",
    "msg": "Need auth",
    "request_id": ""
  },
  "success": 0
}
```

---

## Public endpoints (no auth)

### 1. Search teachers

```
POST https://api.italki.com/api/v2/teachers
```

**Request body (full filter payload):**

```json
{
  "teach_language": {
    "language": "english",
    "max_price": 5300,
    "min_price": 400,
    "is_native": 1
  },
  "teacher_info": {
    "origin_country_id": ["US"],
    "course_category": ["CA001", "CA005"],
    "course_tags": ["T0005", "T0001"],
    "teacher_type": 1,
    "recording_permission": 1,
    "has_trial": 1,
    "instant_lesson_status": 1
  },
  "speak_language_and": ["spanish"],
  "week_time_user": {
    "weekday": [0, 1, 2, 3, 4]
  },
  "has_get_only_72h_data": 1,
  "page": 1,
  "page_size": 20,
  "user_timezone": "America/Bogota",
  "sort_by": "recommend"
}
```

**Required fields:**
- `teach_language.language` — language slug (e.g., `"english"`, `"spanish"`, `"chinese"`)
- `page` — page number (1-based)
- `page_size` — results per page. **Max 99** (1-99 work). `page_size=100` returns only 20 items despite metadata. `page_size>100` errors: `"page_size is too big, the maximum value is 100."` (CO167). Use 99 to fetch all filtered results in fewer pages.
- `user_timezone` — IANA timezone (e.g., `"America/Bogota"`)

**Type constraints (verified):**
- `teacher_type` must be a **number** (0, 1, 2, 3). Array `[1,2]` returns error. To get both pro and tutor, use `teacher_type: 0` (any) or make two queries.
- `origin_country_id`, `course_category`, `course_tags` must be **arrays**. Single strings are ignored (return all or 0).
- `speak_language_and` must be an **array of language slug strings**. Objects with level (e.g., `{"language":"spanish","min_level":3}`) return 0. Level filtering is not supported via API — filter client-side using `teacher_info.also_speak[].level` (1-7 scale).

**Filter fields (all verified working, Aug 2026):**

| Field | Location | Type | Example | Effect | Verified |
|---|---|---|---|---|---|
| `origin_country_id` | `teacher_info` | string[] (ISO codes) | `["US"]` | 4278→794. Multiple: `["US","GB","CA"]`→1679. Invalid `"XX"`→0. Empty `[]`→4278 (no filter). | ✅ |
| `teacher_type` | `teacher_info` | number | `1` | 1=professional (2253, `is_pro:1`), 2=community tutor (2026, `is_pro:0 AND is_tutor:1`). 0 and 3 are identical to not sending (4279, any). Array `[1,2]` errors. | ✅ |
| `course_category` | `teacher_info` | string[] | `["CA005"]` | See category table below. Invalid `"CA999"`→0. | ✅ |
| `course_tags` | `teacher_info` | string[] | `["T0005"]` | See tag table below. Invalid `"T9999"`→0. | ✅ |
| `recording_permission` | `teacher_info` | number | `1` | 0=disabled (1770), 1=enabled (2508). Controls italki Plus AI Lesson Summary: teacher allows italki to record lesson audio for automatic transcription and AI-generated lesson summaries. NOT about students recording lessons. | ✅ |
| `has_trial` | `teacher_info` | number | `1` | 0=no trial (210), 1=has trial (4068), 2=invalid (0) | ✅ |
| `instant_lesson_status` | `teacher_info` | number | `1` | 0=not instant (4242), 1=instant (36), 2=invalid (0) | ✅ |
| `max_price` | `teach_language` | number (cents) | `5300` | Max price filter. Alone: max=1000→639. min>max→0. | ✅ |
| `min_price` | `teach_language` | number (cents) | `400` | Min price filter. Alone: min=5000→408. | ✅ |
| `is_native` | `teach_language` | number | `1` | 0=any (4278), 1=native speaker (2646) | ✅ |
| `speak_language_and` | top-level | string[] (language slugs) | `["spanish"]` | AND logic (must speak ALL). 1 lang→1085, 2 langs→1203, 3 langs→1589. Invalid `"klingon"`→0. | ✅ |
| `has_get_only_72h_data` | top-level | number | `1` | 0=any (4278), 1=available in next 72h (3622) | ✅ |
| `week_time_user.weekday` | top-level | number[] (0-6) | `[0,1,2,3,4]` | 0=Sun, 1=Mon, ..., 6=Sat. Individual: Sun=3301, Sat=2196. Weekdays [0-4]→3967. | ✅ |

**Filters that do NOT work:**
- `sort_by` — tested 12 values (`recommend`, `price_low`, `price_high`, `price_asc`, `price_desc`, `rating`, `popular`, `new`, `hot`, `sessions`, `trial_price_low`, `trial_price_high`). All return identical ordering. **Sort must be done client-side.**
- `speak_language_or` — returns 4278 (no filtering effect). Use `speak_language_and` instead.
- Top-level `origin_country_id`, `also_speak`, `price_min`, `price_max`, `is_pro`, `is_tutor`, `has_trial`, `instant_lesson`, `sort` — all ignored. These must be nested inside `teacher_info` or `teach_language` with the correct field names.

**Course categories and their tags (verified via API, Aug 2026):**

The `/teacher/search/category` endpoint defines the **recommended** tag set per category. The API does NOT hard-enforce pairing — teachers can tag any course with any tag. When `course_category` and `course_tags` are both specified, the API returns teachers who have at least one course matching BOTH. Cross-category pairs usually return 0 because teachers typically only use recommended tags, but exceptions exist (e.g., CA005+T0001=1 — a conversation course also tagged with pronunciation).

| Category | Name | Teachers | Recommended tags |
|---|---|---|---|
| `CA001` | Language Essentials | 3180 | T0001=Pronunciation, T0002=Grammar, T0003=Spelling, T0004=Reading, T0005=Listening, T0006=Writing, T0083=Speaking |
| `CA002` | Business | 475 | T0007=Meeting, T0008=Presentation, T0009=Job Interview, T0010=Negotiation, T0011=Business Etiquette + industry tags T0012-T0049 (see below) |
| `CA003` | Test Preparation | 455 | T0050=IELTS, T0051=TOEFL, T0052=TOEIC, T0053=FCE, T0054=BEC, T0055=PET, T0056=CAE, T0057=CPE, T0058=KET, T0082=Duolingo English Test, T0094=OET, T0096=CELPIP (English exams). Language-specific tags (valid for CA003, return 0 for English, work with their languages): T0059=ILEC, T0060=HSK (Chinese), T0064=DELF, T0065=TELC, T0080=TCF, T0081=TEF (French), T0066=DELE, T0067=CELU (Spanish), T0068=CILS, T0069=CELI, T0095=PLIDA (Italian), T0070=JLPT, T0071=EJU (Japanese), T0072=KLPT, T0073=TOPIK (Korean), T0074=TORFL (Russian), T0075=ALPT (Arabic), T0076=DSH, T0077=TestDaF, T0097=Goethe, T0098=ÖSD, T0099=TELC (German), T0078=CELPE-Bras, T0079=CAPLE (Portuguese). Names verified against italki JS translation map. |
| `CA004` | Kids | 318 | MHP111=3-6 years, MHP112=7-12 years, MHP113=13-15 years, MHP114=16+ years (kids age brackets, not T codes) |
| `CA005` | Conversation | 3278 | CA065=Conversation Practice (sub-category code, not a T tag) |
| `CA067` | Medical | 38 | T0085=Medicine, T0086=Dentistry, T0087=Healthcare, T0088=Health, T0089=Fitness |
| `CA068` | Technology | 39 | T0090=Programming/Coding, T0091=Data Science, T0092=Computer Science, T0093=Product Development |

**Industry tags (T0012-T0049, recommended for CA002 Business):**

All 38 verified working with CA002. Some return 0 for English (T0016=Agriculture, T0024=Energy, T0027=Entertainment, T0039=Property, T0044=Security) — valid pairs but no English teachers tagged them.

T0012=Industry Terminology, T0013=Aerospace, T0014=Accountancy, T0015=Administration, T0016=Agriculture, T0017=Automotive, T0018=Banking, T0019=Charity, T0020=Construction, T0021=Consultancy, T0022=Customer Service, T0023=Digital, T0024=Energy, T0025=Education, T0026=Engineering, T0027=Entertainment, T0028=Finance, T0029=Government, T0030=Human Resources, T0031=Hospitality, T0032=IT, T0033=Insurance, T0034=Legal Management, T0035=Manufacturing, T0036=Marketing, T0037=Media, T0038=Medical & Health, T0039=Property, T0040=Purchasing, T0041=Retail, T0042=Sales, T0043=Science, T0044=Security, T0045=Technology, T0046=Telecommunications, T0047=Tourism, T0048=Trade, T0049=Transportation

**Tag count summary (all 99 T codes T0001-T0099 accounted for):**

| Category | Tag count | Range |
|---|---|---|
| CA001 | 7 | T0001-T0006, T0083 |
| CA002 | 43 | T0007-T0011, T0012-T0049 |
| CA003 | 36 | T0050-T0060, T0064-T0082, T0094-T0099 (language-specific) |
| CA067 | 5 | T0085-T0089 |
| CA068 | 4 | T0090-T0093 |
| Meta | 1 | T0084=All (returns 0 as filter) |
| Invalid | 3 | T0061-T0063 (not in JS source, return 0) |
| **Total** | **95 valid + 1 meta + 3 invalid** | |

> Tag names verified against the italki JS translation map (`/_next/static/chunks/`, Aug 2026). This corrected 15 previously wrong exam-tag names in the T0064-T0081 range (e.g. T0070 is JLPT, T0073 is TOPIK, T0080=TCF and T0081=TEF are French — 84 and 63 teachers respectively).

> **Note:** The `/teacher/search/category` endpoint only returns primary tags (T0007-T0011 for CA002), NOT the industry sub-tags (T0012-T0049). Industry tags were verified by testing all 38 against CA002 individually.
>
> **CA003** is missing from the `/teacher/search/category` endpoint response but works in the search API. Exam tags are language-specific: T0060 (HSK) returns 0 for English but 118 for Chinese; T0070 (JLPT) returns 0 for English but 90 for Japanese; T0066 (DELE) returns 0 for English but 108 for Spanish.
>
> **T0084=All** appears in every category's tag list from the endpoint, but returns 0 results when used as a `course_tags` filter — it's a meta-tag meaning "all tags", not a real filter.
>
> **T0061-T0063** don't exist in the JS translation map and return 0 for all languages — likely reserved or deprecated codes.

**Combined filter example (all filters active):**

```json
{
  "teacher_info": { "origin_country_id": ["US"], "teacher_type": 1 },
  "teach_language": { "language": "english", "max_price": 2000, "min_price": 400, "is_native": 1 },
  "speak_language_and": ["spanish"],
  "page": 1, "page_size": 20, "user_timezone": "America/Bogota"
}
```

Result: **74 teachers** (down from 4278). All US-origin, all pro, all native English, all Spanish-speaking, all $4-$20/session.

**Response:**

```json
{
  "meta": { ... },
  "data": [ /* array of teacher objects (same structure as GET /teacher/{id}) */ ],
  "success": 1,
  "paging": {
    "page": 1,
    "page_size": 20,
    "total": 74,
    "has_next": 1
  }
}
```

**Verified limitations:**
- **Max page 100.** Page 101+ returns an empty `data` array. At `page_size=99` that's up to 9900 results — covers all 4278 English teachers in 44 pages (verified pages 43-45 and 100 return data, page 101 empty). The earlier "2000 teacher cap" was an artifact of testing at `page_size=20`. With filters, total is smaller so this is rarely an issue.
- **No server-side sort.** `sort_by` field is accepted but ignored. Sort client-side after fetching.
- **No auth required.** Filters work without auth cookie (verified).
- **Rate limiting:** Use jittered delays (350-650ms) + exponential backoff on 429. Respect `Retry-After` header.

**For our CLI:** Use the filter payload to narrow results server-side, then sort client-side. No need to fetch all 100 pages when filters reduce the pool to <100.

**Source:** [mludv/italki_teachers](https://github.com/mludv/italki_teachers/blob/main/crawl.py), verified working Aug 2026.

---

### 2. Teacher profile

```
GET https://api.italki.com/api/v2/teacher/{id}
```

**Returns the complete teacher profile.** This is the richest endpoint — all teacher data in one call.

**Response structure (verified field-by-field):**

#### `data.user_info`

| Field | Type | Example | Notes |
|---|---|---|---|
| `user_id` | number | 1518723 | Unique teacher ID |
| `nickname` | string | "Tamara Business" | Display name |
| `avatar_file_name` | string | "T015187238" | Avatar ID (URL: `https://imagesavatar-static01.italki.com/{avatar_file_name}_Avatar.jpg`) |
| `is_tutor` | 0/1 | 1 | 1 = teacher also offers community tutor courses. Not mutually exclusive with `is_pro` — a teacher can be both (10/20 teachers in sample have both=1). UI label is determined by `is_pro` alone. |
| `is_pro` | 0/1 | 1 | 1 = professional teacher. UI uses `is_pro === 1 ? "Professional Teacher" : "Community Tutor"` (verified from JS source). |
| `origin_country_id` | string | "US" | ISO country code |
| `living_country_id` | string | "AR" | ISO country code |
| `is_online` | 0/1 | 0 | Currently online |
| `origin_city_id` | string | "ZZ00000" | City code (ZZ00000 = "Other") |
| `origin_city_name` | string | "Other" | City name |
| `living_city_id` | string | "AR00001" | City code |
| `living_city_name` | string | "Buenos Aires" | City name |
| `timezone` | string | "America/Buenos_Aires" | IANA timezone |
| `last_login_time` | string | "2026-08-14T18:59:07+00:00" | ISO 8601 |

#### `data.teacher_info`

| Field | Type | Example | Notes |
|---|---|---|---|
| `video_url` | string | YouTube embed URL | Intro video |
| `video_pic_url` | string | YouTube thumbnail | |
| `qiniu_video_url` | string | qiniu CDN URL | Alternative video host |
| `intro` | string | | Short introduction (for search results) |
| `short_signature` | string | | Tagline |
| `about_me` | string | | Full bio |
| `about_teacher` | string | | Teaching background |
| `teaching_style` | string | | How they teach |
| `introduction` | string | | Detailed introduction with policies |
| `teach_language` | array | `[{language: "english", level: 7}]` | Language + proficiency (1-7) |
| `also_speak` | array | `[{language: "spanish", level: 5}, ...]` | Languages they speak (1-7) |
| `session_count` | number | 9267 | Total sessions taught |
| `student_count` | number | 1098 | Unique students |
| `pro_rating` | string | "5.0" | Rating as professional teacher |
| `tutor_rating` | string | "5.0" | Rating as community tutor |
| `overall_rating` | string | "5.0" | Combined rating (string, not number!) |
| `first_valid_time` | string | "2014-08-08T07:34:29Z" | When teacher joined italki. UI shows as "italki teacher since {date}" (verified from JS source + matching page text). |
| `available_time_90d` | string | "2026-08-20T14:30:00+00:00" | Availability window for next 90 days. Used by JS to compute `availableToday`, `isAvailableTomorrow`, `isAvailableTheDayAfterThreeMonth`. NOT the same as "next available slot" — use schedule endpoint's `closest_available_datetime` for that. |
| `has_trial` | 0/1 | 1 | Offers trial lesson |
| `free_trial` | 0/1 | 0 | Free trial (rare) |
| `instant_lesson_status` | 0/1 | 0 | Offers instant lessons |
| `instant_now` | 0/1 | 0 | Available for instant lesson right now |
| `is_new` | 0/1 | 0 | New teacher |
| `is_student_full` | number (0-5) | 0 | Student acceptance status. 0=All (accepting everyone), 1-2=Existing (only existing students), 3-5=None (not accepting new students). Verified from italki JS source (`accepting_student_type` prop). Search API only returns 0 — non-accepting teachers are excluded from search results. |
| `cancel_policy` | string | | Free-text cancellation policy written by teacher. Often empty (4/5 teachers in sample). |
| `teacher_material_list` | array | `[1,2,3,4,5,6,8,11,12]` | Teaching material IDs |
| `teacher_tag` | array | `[4]` | Category tags |
| `interested_tags` | array | `[{name, text_code}]` | Interest tags (travel, art, finance, etc.) |
| `beginner_friendly_tags` | array | `["TRIO058"]` | Beginner-friendly indicators |
| `exp_info` | array | | Work experience entries |
| `edu_info` | array | | Education entries |
| `cert_info` | array | | Certifications |
| `specialty_cert` | array | | Specialty certifications (with PDF URLs) |
| `sorted_cert_info` | array | | Pre-sorted certifications |
| `teaching_experience` | array | | Teaching experience entries |
| `auto_greeting` | 0/1 | 1 | Auto-greeting enabled |
| `recording_permission` | 0/1 | 0 | Allows italki Plus AI Lesson Summary (teacher permits audio recording for AI transcription). NOT about students recording lessons. |

**`teaching_experience` entry structure:**

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | number | 688 | |
| `user_id` | number | 4308569 | |
| `start_year` | number | 2018 | |
| `end_year` | number | 2155 | `2155` = current/ongoing |
| `institution` | string | "Italki" | |
| `institution_type` | string | "self_employed_online" | e.g., `self_employed_online` |
| `position` | string | "Professional Certified Teacher" | |
| `country` | string | "SE" | |
| `city` | string | "Stockholm - São Paulo" | |
| `description` | string | | |
| `status` | number | 1 | |
| `create_at` | string | "2024-03-05T11:40:46Z" | |
| `create_by` | string | "4308569" | User ID who created |
| `update_at` | string | "2025-10-10T03:30:34Z" | |
| `update_by` | string | "4308569" | User ID who last updated |

**`exp_info` entry structure:**

| Field | Type | Example | Notes |
|---|---|---|---|
| `country` | string | "AR" | |
| `city` | string | "Buenos Aires" | |
| `company` | string | "Italki" | |
| `job` | string | "Professional Teacher" | |
| `industry` | string | "language_literature" | Industry slug (e.g., `art_humanities`, `technology_engineering`) |
| `description` | string | | |
| `start_year` | number | 2014 | |
| `end_year` | number | 2020 | `2155` = current/ongoing |
| `status` | number | 1 | |
| `file_ext` | string | "" | |
| `file_path` | string | "" | |
| `exp_id` | number | 17212 | |

**`edu_info` entry structure:**

| Field | Type | Example | Notes |
|---|---|---|---|
| `institution` | string | "Indiana University" | |
| `major` | string | "Education - TESOL" | |
| `level` | number | 2 | `[unverified — enum not decoded]` JS maps to text codes: 1→TA551, 2→ST016, 3→ST017, 4→ST018, other→C0087. Translations not found in JS bundle. Not displayed by CLI. |
| `start_year` | number | 1977 | |
| `end_year` | number | 1979 | `2155` = current/ongoing |
| `status` | number | 1 | |
| `file_ext` | string | "pdf" | |
| `description` | string | | |
| `create_time` | string | "2018-05-11T10:46:08Z" | |
| `edu_id` | string | UUID | |

**`cert_info` entry structure:**

| Field | Type | Example | Notes |
|---|---|---|---|
| `certificate` | string | "Master's degree" | |
| `institution` | string | "Indiana University" | |
| `description` | string | | |
| `end_year` | number | 1979 | `2155` = current/ongoing |
| `language` | string | "portuguese" | Language the cert is for |
| `type` | string | "EUROLTA" | Cert type code |
| `type_text_code` | string | "TA567" | i18n text code |
| `status` | number | 1 | |
| `file_ext` | string | "pdf" | |
| `create_time` | string | "2018-05-11T10:52:34Z" | |
| `update_time` | string | "2024-03-05T11:53:51Z" | |
| `cert_id` | string | UUID | |

#### `data.course_info` (trial lesson info)

| Field | Type | Example | Notes |
|---|---|---|---|
| `trial_length` | number | 2 | Trial length in 15-min units (2=30min) |
| `has_trial` | 0/1 | 1 | Offers trial |
| `trial_price` | number | 1000 | Trial price in **cents** ($10.00) |
| `min_price` | number | 1500 | Cheapest regular lesson in **cents** ($15.00) |
| `trial_session_count` | number | 566 | Number of trial sessions completed |
| `trial_description` | string | | Trial lesson description |
| `has_beginner_course` | 0/1 | 0 | Has beginner-specific course |

#### `data.pro_course_detail` (professional courses with pricing)

Array of course objects. **This is where the 30/45/60-minute pricing lives.**

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | number | 30553 | Course ID |
| `teacher_id` | number | 1518723 | |
| `language` | string | "english" | |
| `title` | string | "Conversation, Vocabulary, Pronunciation..." | Course name |
| `description` | string | | Full course description |
| `level_lower_limit` | number | 3 | Min student level (1=A1, 7=C2) |
| `level_up_limit` | number | 6 | Max student level |
| `course_category` | string | "CA005" | Category code (CA002=business, CA005=conversation) |
| `course_tags` | array | `["T0008", "T0028"]` | Tag codes |
| `session_price` | number | 1500 | Default per-session price in **cents** |
| `student_count` | number | 627 | Students enrolled |
| `session_count` | number | 6067 | Sessions delivered |
| `has_package` | 0/1 | 1 | Offers package pricing |
| `price_list` | array | | **Per-duration pricing** (see below) |

**`price_list` entry structure (THE pricing data):**

| Field | Type | Example | Notes |
|---|---|---|---|
| `session_price` | number | 1000 | Per-session price in **cents** ($10.00) |
| `session_length` | number | 2 | **Length in 15-min units: 2=30min, 3=45min, 4=60min, 6=90min** |
| `package_length` | number | 5 | Number of sessions in package (1 = individual) |
| `package_price` | number | 5000 | Total package price in **cents** ($50.00) |
| `course_id` | number | 30553 | |
| `course_price_id` | number | 1092126 | |

**Example: Tamara's Conversation course pricing**

| Duration | Individual | 5-pack | 10-pack |
|---|---|---|---|
| 30min (length=2) | $10.00 (1000¢) | $50.00 (5000¢) | $100.00 (10000¢) |
| 60min (length=4) | $15.00 (1500¢) | $70.00 (7000¢) | $135.00 (13500¢) |

**Note:** 45min (length=3) is only offered on some courses. 90min (length=6) is rare.

#### `data.tutor_course_detail`

Same structure as `pro_course_detail` but for community tutor courses. Empty for professional teachers.

#### `data.teacher_statistics`

| Field | Type | Example | Notes |
|---|---|---|---|
| `finished_session` | number | 9264 | Total completed sessions |
| `response_rate` | number | 1.0 | 0-1 (last 3 months) |
| `attendance_rate` | number | 0.99 | 0-1 (last 3 months) |
| `finished_session_list` | array | `[{month: 5, data: 43}, ...]` | Monthly session counts (last 3 months) |
| `response_rate_list` | array | `[{month: 5, data: 0.84}, ...]` | Monthly response rates |
| `attendance_rate_list` | array | `[{month: 5, data: 0.9}, ...]` | Monthly attendance rates |

**Month field:** `month` is 1-12 (calendar month), `data` is the value for that month.

#### `data.student_info` (viewer's relationship to this teacher)

| Field | Type | Example | Notes |
|---|---|---|---|
| `trial_left_amount` | number | 3 | Trial lessons remaining (for viewer) |
| `already_has_trial` | 0/1 | 0 | Viewer already used trial with this teacher |
| `is_favor` | 0/1 | 0 | Viewer favorited this teacher |
| `is_schedule` | 0/1 | 1 | Has scheduled sessions |
| `is_blocked` | 0/1 | 0 | Viewer blocked by teacher |
| `is_have_filled_contact_teacher` | boolean | false | Has contacted teacher |

**Note:** `student_info` is present in public responses but reflects the anonymous viewer (not authenticated).

#### `data.exam_result_shown`

| Field | Type | Example | Notes |
|---|---|---|---|
| `exam_shown_id` | number | 0 | |
| `exam_type` | number | 0 | |
| `level` | string | | |
| `score` | number | 0 | |
| `show_badge` | 0/1 | 0 | |
| `show_score` | 0/1 | 0 | |

---

### 3. Teacher schedule (availability)

```
GET https://api.italki.com/api/v2/teacher/{id}/schedule
```

**No auth required.** Returns availability for the next ~7 days by default.

**Query params:**

| Param | Format | Effect |
|---|---|---|
| `start_time` | `YYYY-MM-DD` (or ISO 8601) | Start of date range. Default: today |
| `end_time` | `YYYY-MM-DD` (or ISO 8601) | End of date range. Default: +7 days. Max tested: +28 days (4 weeks) |

Both params accept `YYYY-MM-DD` or full ISO 8601. With `start_time=2026-08-16&end_time=2026-09-15`, returns 30 slots spanning Aug 16 – Sep 14.

**Response:**

```json
{
  "meta": { ... },
  "data": {
    "minimum_request_time_interval": 720,
    "available_schedule": [
      { "start_time": "2026-08-17T14:00:00+00:00", "end_time": "2026-08-17T15:00:00+00:00" },
      { "start_time": "2026-08-17T15:30:00+00:00", "end_time": "2026-08-17T16:30:00+00:00" }
    ],
    "teacher_lesson": [
      { "start_time": "2026-08-18T14:00:00+00:00", "end_time": "2026-08-18T15:00:00+00:00" }
    ],
    "student_group_class": [],
    "teacher_group_class": [],
    "student_lesson": [],
    "closest_available_datetime": ""
  },
  "success": 1
}
```

**Fields:**

| Field | Type | Notes |
|---|---|---|
| `minimum_request_time_interval` | number | Minutes of advance booking required. Varies per teacher (observed 360–720) |
| `available_schedule` | array | Open time slots the teacher has marked available. These are **containers** — booked sessions inside them are listed separately in `teacher_lesson`. Subtract `teacher_lesson` overlaps to get actual free time. |
| `teacher_lesson` | array | Already-booked sessions. Overlaps with `available_schedule` by design — these are holes inside the availability windows. |
| `student_group_class` | array | Group classes (student perspective) |
| `teacher_group_class` | array | Group classes (teacher perspective) |
| `student_lesson` | array | Student's booked lessons with this teacher |
| `closest_available_datetime` | string | Next available slot (ISO 8601, may be empty) |

**Verified limitations:**
- **Date range filtering works** via `start_time` and `end_time` params. Other param names (`start_date`, `end_date`, `from`, `to`, `start`, `end`, `date`, `month`, `user_timezone`) are ignored.
- **Time slots are in UTC** (`+00:00`). Convert to user's timezone client-side.
- **`available_schedule` contains booked sessions.** The API returns the teacher's full availability windows, not free slots. Booked sessions (`teacher_lesson`) overlap with `available_schedule` — subtract them to get actual free time. Slots under 30 min after subtraction are not bookable (lessons start at 30 min).
- **Slot duration** varies — typically 60 min, but fragments as short as 3 min appear near "now + advance booking" boundary.

---

### 4. Teacher reviews

```
GET https://api.italki.com/api/v2/teacher/{id}/lesson_reviews?page={page}&page_size={size}&language={lang}&need_top_total=1&allow_empty={0|1}
```

**No auth required.** Paginated student reviews. This is the endpoint italki's web UI uses.

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `page_size` | number | 10 | Max 100 (larger values silently capped to 100) |
| `language` | string | (all) | Filter by lesson language (e.g. `english`, `spanish`). Omit for all languages |
| `need_top_total` | 0/1 | 0 | Returns `top_total` (count of Teacher's picks across ALL languages, not filtered) |
| `allow_empty` | 0/1 | 0 | Include reviews with no text (0 = exclude empty, 1 = include) |

**Response:**

```json
{
  "meta": { "performance": 0, "server_time": 0, "ver": "2.2.0" },
  "data": {
    "review_list": [
      {
        "user_info": {
          "user_id": 17346559,
          "nickname": "Aleksandra Bosikova",
          "avatar_file_name": "T173465590",
          "is_tutor": 0,
          "is_pro": 0,
          "origin_country_id": "RU"
        },
        "comment_info": {
          "comment_id": 26530687,
          "session_id": 3959428458,
          "session_language": "english",
          "content": "Thanks to English lessons...",
          "create_time": "2025-10-02T11:54:06Z",
          "is_reviews_up": true
        },
        "comment_count": 1,
        "has_anonymous": 0,
        "lesson_count": 51,
        "allow_show": 1
      }
    ],
    "comment_total": 0,
    "top_total": 3
  },
  "success": 1,
  "paging": {
    "has_next": 1,
    "total": 138,
    "page": 1,
    "page_size": 10
  }
}
```

**Fields:**

| Field | Type | Notes |
|---|---|---|
| `data.review_list` | array | Reviews — Teacher's picks surfaced first (sorted by italki) |
| `data.comment_total` | number | Unknown — observed 0 consistently. Not the review count (use `paging.total`) |
| `data.top_total` | number | Count of Teacher's picks across ALL languages (not filtered by `language` param) |
| `user_info.user_id` | number | Reviewer's user ID |
| `user_info.nickname` | string | Reviewer's display name |
| `user_info.origin_country_id` | string | Reviewer's country |
| `comment_info.comment_id` | number | Unique review ID |
| `comment_info.session_id` | number | Associated session ID |
| `comment_info.session_language` | string | Language taught in the session |
| `comment_info.content` | string | Review text |
| `comment_info.create_time` | string | ISO 8601 timestamp |
| `comment_info.is_reviews_up` | boolean | Teacher's pick — shown as highlighted on italki UI. Verified: 3/100 reviews on teacher 5047573 have `true`, matching the 3 "Teacher's pick" reviews shown on the UI (Aleksandra, Carlos, Pablo Orosco) |
| `comment_count` | number | Number of comments by this student |
| `lesson_count` | number | Total lessons this student had with teacher |
| `has_anonymous` | 0/1 | Anonymous review |
| `allow_show` | 0/1 | Visible (1) or hidden (0) |

**Verified:**
- Pagination works: `page` and `page_size` query params are respected.
- `page_size` max is 100 (101+ silently capped to 100, no error).
- `language` filter works: teacher 5047573 returns 254 reviews without filter, 138 with `language=english`.
- Teacher's picks (`is_reviews_up=true`) are sorted to the top of `review_list` by the API.
- `top_total` is NOT filtered by `language` — returns total picks across all languages.
- `allow_empty=0` filters reviews with no `comment_info` object (not empty content strings — reviews with empty content still appear).

**Legacy endpoint:** `GET /api/v2/teacher/{id}/reviews` still works but returns a flat `data: []` array (no `review_list` wrapper, no `top_total`, no language filter). Not used by the CLI.

---

### 5. User profile

```
GET https://api.italki.com/api/v2/user/{id}
```

**No auth required.** Returns non-teacher user data.

**Response:**

```json
{
  "meta": { ... },
  "data": {
    "user_id": 1518723,
    "nickname": "Tamara Business",
    "avatar_file_name": "T015187238",
    "learning_language": "",
    "introduction": "",
    "timezone_iana": "America/Buenos_Aires",
    "register_status": 0,
    "birthday": "",
    "age": 0,
    "gender": 2,
    "is_online": 0,
    "last_login_time": "2026-08-14T18:59:07+00:00",
    "is_premium": 0,
    "notebook_count": 0,
    "question_count": 0,
    "discussion_count": 0,
    "friends_count": 0,
    "activity_points": 0,
    "living_country_id": "AR",
    "living_city_name": "Buenos Aires",
    "origin_country_id": "US",
    "origin_city_name": "Other",
    "is_tutor": 1,
    "is_pro": 1,
    "language_list": [],
    "purpose_list": [],
    "preferences": {},
    "member_info": {}
  },
  "success": 1
}
```

**Note:** This endpoint returns less teacher-specific data than `GET /teacher/{id}`. Use `/teacher/{id}` for teacher profiles. Use `/user/{id}` for student/non-teacher profiles.

**Deprecated:** The old v1 endpoint `https://www.italki.com/api/user/{id}` returns 404.

---

### 6. Teacher filter metadata

```
POST https://api.italki.com/api/v2/teachers/filter
```

**Returns metadata about filtered results** (count, price distribution) but NOT actual teacher data. Used by the website for UI state.

**Request body:** Same as search + filter fields.

**Response:**

```json
{
  "meta": { ... },
  "data": {
    "count": 4011,
    "price_list": [0, 202, 203, 307, ...],
    "sort_scores": [],
    "recommendation_id": "RID-64-41fb-9b82-b4082ccb8a9c-CID-228e15",
    "algo_detail": {
      "campaign_name": "six_v1_personalized_ranking_cpn",
      "recipe_name": "aws-personalized-ranking"
    },
    "is_libra": 1
  },
  "success": 1
}
```

**Verified:** The `count` field returns 4011 regardless of filter parameters sent. The `price_list` is a price distribution histogram. The `recommendation_id` is used by the website's recommendation engine but does NOT filter results when passed to `GET /teachers`.

**Not useful for our CLI.** Filter client-side instead.

---

## Authenticated endpoints (require auth)

### Sessions

```
GET https://api.italki.com/api/v2/sessions
```

**Without auth:**

```json
{
  "meta": { ... },
  "error": { "code": "NeedAuth", "text_code": "CO167", "msg": "Need auth" },
  "success": 0
}
```

**Auth method:** Token-based. Login returns `i_token` in JSON response. Attach as `X-Token` header on authenticated requests. (Previously believed to be cookie-based — verified wrong Aug 15, 2026.)

### Finance overview (student)

```
GET https://api.italki.com/api/v2/finance/common/overview/student
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

**Response (verified Aug 15, 2026):**

```json
{
  "meta": { "performance": 0, "server_time": 0, "ver": "2.2.0" },
  "data": {
    "purchase_pending_itc": 0,
    "session_pending_itc": 0,
    "frozen_itc": 0,
    "total_itc": 49300,
    "available_itc": 49300,
    "available_coupons": 0
  },
  "success": 1
}
```

| Field | Type | Unit | Notes |
|---|---|---|---|
| `total_itc` | number | ITC cents | Total credits (49300 = $493.00) |
| `available_itc` | number | ITC cents | Available to spend |
| `purchase_pending_itc` | number | ITC cents | Pending purchase |
| `session_pending_itc` | number | ITC cents | Locked in upcoming sessions |
| `frozen_itc` | number | ITC cents | Frozen/disputed |
| `available_coupons` | number | count | Available coupons |

**Note:** ITC cents use the same unit as price fields in the teachers API (1 ITC = 1 USD cent).

### Future lessons

```
GET https://api.italki.com/api/v3/lesson/future_lessons
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

**Response:** Bare array (no `{meta, data, success}` wrapper — v3 API pattern).

```json
[]
```

Empty when no upcoming lessons. Structure of lesson objects same as past_lessons below.

**Verified:** Aug 15, 2026 (returned empty array — no upcoming lessons on test account).

### Past lessons

```
GET https://api.italki.com/api/v3/lesson/past_lessons?length={N}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

**Params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `length` | number | — | Number of lessons to return |

**Response:** Bare array of lesson objects.

```json
[
  {
    "id": "1234567890",
    "name": "lesson title",
    "name_text_code": "",
    "status": "F",
    "kind": "lesson",
    "number": 1,
    "start_time": "2026-01-01T10:00:00Z",
    "language": "english",
    "group": "completed",
    "operate_deadline": "0001-01-01T00:00:00Z",
    "user_list": [
      {"user_id": 87654321, "user_type": "teacher", "nickname": "teacher_name", "avatar_file_name": "avatar_id", "origin_country_id": "US"},
      {"user_id": 12345678, "user_type": "student", "nickname": "example_user", "avatar_file_name": "", "origin_country_id": "CO"}
    ],
    "group_class_student_obj_id": null,
    "course_id": 0,
    "course_category": null,
    "unscheduled_count": null,
    "display_text": null,
    "status_dot": {"visible": false, "color": ""},
    "timeline": "2026-01-01T10:50:00Z",
    "lesson_type": "3",
    "invitation_order_id": null,
    "topic": "lesson topic",
    "duration": 30
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Lesson ID |
| `name` | string | Lesson title |
| `status` | string | `"F"` = completed, other values TBD |
| `start_time` | string | ISO 8601 UTC |
| `language` | string | Lesson language |
| `group` | string | `"completed"`, `"upcoming"`, `"pending"`, `"expired"` (verified from i18n map) |
| `user_list` | array | Participants: `[{user_id, user_type, nickname, avatar_file_name, origin_country_id}]`. `user_type`: `"teacher"` or `"student"` |
| `lesson_type` | string | Numeric string (meaning TBD) |
| `topic` | string | Lesson topic |
| `duration` | number | Minutes |

**Verified:** Aug 15, 2026.

### User conversations (messages)

```
GET https://api.italki.com/api/v3/im/user_conversations?version=1&limit={N}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

**Params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `version` | number | — | API version (use `1`) |
| `limit` | number | — | Max conversations to return |

**Response:** Bare array of conversation objects.

```json
[
  {
    "id": "123456789",
    "user_id": 12345678,
    "kind": "SINGLE",
    "oppo_id": 87654321,
    "conversation_id": "87654321_12345678",
    "unread_count": 0,
    "last_message_time": "2026-01-01T10:00:00Z",
    "message_text": "last message preview...",
    "message_text_code": "",
    "message_text_list": null,
    "create_time": "2026-01-01T10:00:00Z",
    "update_time": "2026-01-01T10:00:00Z",
    "is_deleted": false
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Conversation ID |
| `user_id` | number | Current user ID |
| `kind` | string | `"SINGLE"` = 1-on-1, other values TBD |
| `oppo_id` | number | Other participant's user ID (teacher) |
| `conversation_id` | string | `{oppo_id}_{user_id}` format |
| `unread_count` | number | Unread messages |
| `last_message_time` | string | ISO 8601 UTC |
| `message_text` | string | Last message preview |
| `is_deleted` | boolean | Conversation deleted |

**Verified:** Aug 15, 2026.

### User profile with details

```
GET https://api.italki.com/api/v2/user/{user_id}?has_detail=1
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

**Params:**

| Param | Type | Notes |
|---|---|---|
| `has_detail` | number | `1` = include languages, preferences, membership, purpose |

**Response:** Standard v2 wrapper (`{meta, data, success}`).

Key fields in `data`:

| Field | Type | Notes |
|---|---|---|
| `user_id` | number | User ID |
| `nickname` | string | Display name |
| `learning_language` | string | Primary learning language |
| `timezone_iana` | string | IANA timezone (e.g., `America/Bogota`) |
| `is_premium` | number | Premium membership flag |
| `interested_tags` | array | `[{name, text_code}]` — interest tags |
| `language_list` | array | `[{language, level, is_learning, is_teaching, priority}]` — level 1-7 |
| `purpose_list` | array | `[{language, role, purpose, sub_purpose}]` — learning purpose |
| `member_info` | object | `{status, start_time, end_time}` — premium membership dates |
| `preferences` | object | `{lesson_schedule: {available_days, preferred_time_of_day, preferred_class_duration}}` |
| `communication` | object | Connected apps (zoom, teams, etc.) |

**Note:** Without `has_detail=1`, returns basic profile only (no languages, preferences, membership).

**Verified:** Aug 15, 2026.

### Current user foundation

```
GET https://api.italki.com/api/v2/me/foundation?has_user=1&has_detail=1&has_language=1
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

Returns current user profile without needing a user ID. Same shape as login response `data` + `language_list`.

**Verified:** Aug 15, 2026.

### Lesson count

```
GET https://api.italki.com/api/v2/me/lesson_count
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

```json
{"meta": {...}, "data": {"session_count": 1}, "success": 1}
```

### Lesson amount (v3)

```
GET https://api.italki.com/api/v3/lesson/me/lesson_amount
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

Bare object (v3 pattern): `{"amount": 1}`

### Teacher list (your teachers)

```
GET https://api.italki.com/api/v2/user/{user_id}/teacher_list?page_size={N}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

Returns teachers you've had lessons with. Array of teacher objects with `user_id`, `nickname`, `teach_language`, `also_speak`, `is_online`.

**Validated Aug 15, 2026:** `page_size=100` returns all available (no max limit issue). Default page_size ~4-5 if omitted.

### United lessons (lesson history with filters)

```
GET https://api.italki.com/api/v2/united_lessons?page={page}&page_size={size}&user_type=student&kind={kind}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

| Param | Type | Required | Notes |
|---|---|---|---|
| `user_type` | string | yes | `student` / `teacher` — perspective |
| `kind` | string | no | **Broken** — only `all` returns data. `completed`/`upcoming`/`canceled`/`waiting`/`unscheduled`/`action_required` all return 0. Same pattern as `sort_by` in teachers API |
| `page` | number | yes | Pagination (1-based) |
| `page_size` | number | yes | **Max 50** (60+ = InvalidParam). Different from teachers API (max 99) |

Returns paginated lesson history with session details, pricing, teacher info, and action list. Richer than v3 `past_lessons`.

**Validated Aug 15, 2026:**
- `page_size` max = 50 (not 99 like teachers API)
- `kind` filter is broken — use `all` and filter client-side
- Response includes `paging: {total, page, page_size, has_next}`

**`group` values (verified from i18n map):**

| Value | Meaning |
|---|---|
| `completed` | Lesson finished |
| `upcoming` | Lesson scheduled, not yet started |
| `pending` | Awaiting confirmation |
| `expired` | Request expired |

**`card_name` codes (i18n codes):**

| Code | Label |
|---|---|
| `TS665` | Completed |
| `TS654` | Upcoming |
| `TS652` | Expired |
| `TS653` | Declined |
| `TS664` | Lesson canceled |
| `TS677` | New request |

**`session_label` codes:**

| Code | Label |
|---|---|
| `TP752` | Completed |
| `TP757` | Upcoming |
| `TP755` | Canceled |
| `TP754` | Currently live |
| `TP751` | Confirmation needed |

**`im_type` codes:** Single-letter (e.g. `"Z"`). Mapping is server-side, not in JS bundle. Do not assume — display as raw code.

**`duration` field:** 15-min units (2 = 30min, 4 = 60min). Same as `session_duration` in session endpoint. Note: v3 `past_lessons` uses actual minutes instead.

**Related endpoints:**
- `GET /api/v2/united_lessons/filters?user_type=student` — available filter options (languages, teachers)
- `GET /api/v2/united_lessons/all_kind_count?user_type=student` — counts by status: `{"action_required": 0, "upcoming": 0, "completed": 1, "canceled": 0, ...}`

### User calendar

```
GET https://api.italki.com/api/v2/user/my_calendar?as_student=1&start_time={ISO}&end_time={ISO}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10`

| Param | Type | Required | Notes |
|---|---|---|---|
| `as_student` | number | yes | `1` = student perspective. `0` returns empty for student accounts |
| `start_time` | string | yes | ISO 8601 UTC. Omitting returns empty |
| `end_time` | string | yes | ISO 8601 UTC. Omitting returns empty |

Returns `{"lessons": [...], "group_classes": [], "invite_lessons": []}`. Each lesson has teacher info, start/end time, duration, status, language.

**Validated Aug 15, 2026:**
- No range limit — 10-year span returns all lessons in one call
- No pagination — returns everything in range
- Both `start_time` + `end_time` required (omit either → empty array)
- `as_student=1` required for student accounts

### Batch user profiles (v3)

```
GET https://api.italki.com/api/v3/users/profiles?user_ids={id1},{id2},...
```

**No auth required** — public endpoint.

Returns bare array of profile objects. Useful for `compare` — one call instead of N.

Each object: `{user_id, nickname, is_pro, is_tutor, teach_languages, origin_country_id, living_country_id, gender, intro}`

**Validated Aug 15, 2026:**
- No auth required (works without `X-Token`)
- Max ~500 IDs per call (limited by URL length ~4094 chars, not API logic)
- Invalid IDs return empty array entry, no error
- 50 IDs tested, 500 IDs tested — both work

### Learning analytics (v3)

```
GET https://api.italki.com/api/v3/lesson/learning_analytics?language={lang}&all_languages=true
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10` (auth required)

| Param | Type | Required | Notes |
|---|---|---|---|
| `language` | string | no | Filter by language. Omit with `all_languages=true` for all |
| `all_languages` | boolean | no | `true` = include all languages |

Bare object (v3 pattern):
  "longest_streak": 1,
  "weekly_lessons": 0,
  "weekly_lessons_hours": 0,
  "total_lessons": 1,
  "total_lessons_min": 30,
  "total_practice": 0
}
```

### Session detail (lesson by ID)

```
GET https://api.italki.com/api/v2/session/{session_id}
```

**Headers:** `X-Token: <i_token>`, `X-Device: 10` (auth required)

Returns full lesson detail: session state, pricing, course info, IM tools, teacher info, review.

Key objects in `data`:

| Object | Fields | Notes |
|---|---|---|
| `session_obj` | `session_id`, `status`, `session_start_time`, `session_end_time`, `session_duration`, `session_price`, `session_tag`, `session_label`, `is_instant` | `status: "F"` = completed. `session_duration` in 15-min units (2 = 30 min) |
| `course_obj` | `course_id`, `course_title`, `course_description`, `course_session_count`, `course_language` | Course the lesson belongs to |
| `im_obj` | `main_im_dict: {im_type, student_im_account, teacher_im_account}` | `im_type` is a single-letter code. Mapping is server-side, not in JS bundle — do not assume |
| `oppo_user_obj` | `user_id`, `nickname`, `avatar_file_name`, `origin_country_id` | Teacher info |
| `action_list` | `[{action, status, extra_params}]` | Available actions (`view_class`, `book_next_lesson`, `support`) |
| `lesson_review_obj` | object | Review if submitted, empty if not |

**Verified:** Aug 15, 2026. Auth required (no auth = NeedAuth).

### Simple schedule (with timezone)

```
GET https://api.italki.com/api/v2/teacher/{id}/simple_schedule?user_timezone={IANA}&closest_available_datetime_type=1&with_half_hour=1
```

**No auth required.**

| Param | Type | Required | Notes |
|---|---|---|---|
| `user_timezone` | string | yes | IANA timezone, URL-encoded (e.g., `America%2FBogota`). Invalid timezone = HTTP 500 |
| `closest_available_datetime_type` | number | no | `1` = include next available slot |
| `with_half_hour` | number | no | `1` = include half-hour slots |

Returns availability matrix (7 days × 6 slots) + `closest_available_datetime`. Simpler than the full schedule endpoint — no need for client-side timezone conversion.

**Validated Aug 15, 2026:**
- No auth required
- `user_timezone` required (omit = InvalidParam)
- Invalid timezone = HTTP 500 (not graceful)

---

## Auth flow (verified Aug 15, 2026)

### Login — pure HTTP, no browser

```
POST https://api.italki.com/api/v2/loginviaemail
```

**Required headers:**

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | |
| `X-Device` | `10` | Web client. Other values: `0`,`4`,`5` = signature error; `1`,`2`,`3` = decrypt error |
| `x-signature` | Computed (see below) | AES-encrypted signature |
| `X-Browser-Key` | Any string | Generated client-side, stored in cookie `kp.browser.key`. Arbitrary value accepted |
| `Origin` | `https://www.italki.com` | |
| `Referer` | `https://www.italki.com/en/login` | |

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "plaintext-password",
  "ver": 1
}
```

**Signature computation:**

```
signature = "11" + "001" + AES-128-CBC(email + password, key, iv).hex().toUpperCase()
```

| Component | Value |
|---|---|
| Type code | `"11"` (email login; `"12"` = phone login) |
| Version | `"001"` |
| AES mode | CBC |
| Key | `1234123412ABCDEF` (16 bytes, UTF-8) |
| IV | `ABCDEF1234123412` (16 bytes, UTF-8) |
| Padding | PKCS7 |
| Plaintext | `email + password` (concatenated, no separator) |

**Source:** Extracted from italki's JS bundle (`main.8e07eb95.js`, webpack module 57326). Uses CryptoJS AES-CBC with hardcoded key/IV.

**Node.js implementation:**

```js
const crypto = require("crypto");
const key = Buffer.from("1234123412ABCDEF", "utf8");
const iv = Buffer.from("ABCDEF1234123412", "utf8");
const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
const encrypted = Buffer.concat([cipher.update(email + password, "utf8"), cipher.final()]);
const signature = "11" + "001" + encrypted.toString("hex").toUpperCase();
```

**Success response (HTTP 200):**

```json
{
  "meta": { "performance": 0, "server_time": 0, "ver": "2.2.0" },
  "data": {
    "user": {
      "user_id": 12345678,
      "nickname": "example_user",
      "email": "user@example.com",
      "timezone_iana": "America/Bogota",
      "is_premium": 1,
      ...
    },
    "i_token": "1234567890gAAAAAB...",
    "pwd_token": "1786760547A613655FAC...",
    ...
  },
  "success": 1
}
```

**Error responses:**

| `error.code` | Cause | HTTP |
|---|---|---|
| `SignatureError` | Wrong signature (AES key changed, or malformed) | 400 |
| `DecryptError` | Email not encrypted properly (wrong X-Device value) | 400 |
| `DeviceError` | Invalid `X-Device` header | 400 |
| Cloudflare 429 | Rate limited (too many login attempts) | 429 (HTML, not JSON) |

**Verified:** Aug 15, 2026 with real credentials. Returned `success:1`, `i_token`, full user profile.

**Not yet verified:** Wrong password with correct signature (Cloudflare rate-limited before we could test — the API returns JSON errors, but Cloudflare blocks after ~5 login attempts).

**If login breaks:** italki may update the AES key/IV in their JS bundle. Extract new values by fetching the login page, finding the main JS URL, and searching for `enc.Utf8.parse("...")` near `AES.encrypt`. The key/IV are 16-character strings.

### Authenticated requests

After login, save `i_token` to `~/.italki/config.json`. Attach to authenticated requests:

```
X-Token: <i_token>
```

**Unknown:** Token expiration time. `pwd_token` is likely for password changes, not session auth.

## Booking flow (verified Aug 22 + Aug 24, 2026 — two HAR captures)

Pure HTTP booking with `i_token`. Two-stage: create order, then pay. Both trial and single lesson flows captured — `order_type` is always `11`, only `lesson_type` and `course_price_id` differ.

### 1. Coupon/price preview

```
GET https://api.italki.com/api/v2/finance/coupon/verify?source_type={s}&itc={price_cents}&lesson_price={price_cents}&use_balance={0|1}&teacher_id={id}&language={lang}&session_type={type}
```

**Auth required.** Fired twice on payment page load — once with `use_balance=0`, once with `use_balance=1` — to compute both prices for the credits toggle.

| Param | Type | Example | Notes |
|---|---|---|---|
| `source_type` | number | `5` | `5` = booking. Other values TBD |
| `itc` | number | `600` | Same as `lesson_price` (cents) |
| `lesson_price` | number | `600` | Lesson price in cents |
| `use_balance` | 0/1 | `0` | `0` = skip credits, `1` = apply credits |
| `teacher_id` | number | `11842092` | Teacher ID |
| `language` | string | `english` | Lesson language |
| `session_type` | number | `3` | `3` = trial, `1` = single (same as lesson_type) |

### 2. Create order

```
POST https://api.italki.com/api/v3/orders
Content-Type: application/json
X-Token: <i_token>
```

**Body (trial lesson — HAR 1, Aug 22):**
```json
{
  "order_type": 11,
  "lesson_params": {
    "teacher_id": 11842092,
    "language": "english",
    "lesson_type": 3,
    "course_price_id": -1,
    "time_start_list": ["2026-08-29T19:00:00.000Z"],
    "is_instant": false,
    "lesson_count": 1,
    "im_type": "Z",
    "student_id": 31626937
  }
}
```

**Body (single lesson — HAR 2, Aug 24):**
```json
{
  "order_type": 11,
  "lesson_params": {
    "teacher_id": 11842092,
    "language": "english",
    "lesson_type": 1,
    "course_price_id": 783288,
    "time_start_list": ["2026-08-26T16:00:00.000Z"],
    "is_instant": false,
    "lesson_count": 1,
    "im_type": "Z",
    "student_id": 31626937
  }
}
```

| Field | Trial | Single | Notes |
|---|---|---|---|
| `order_type` | `11` | `11` | **Always 11** — same for trial and single (verified Aug 24) |
| `lesson_type` | `3` | `1` | `3` = trial, `1` = single, `2` = package, `4` = instant |
| `course_price_id` | `-1` | `783288` | `-1` = trial. Real ID from teacher's `price_list` for regular |
| `time_start_list` | ISO strings | ISO strings | Slot start times (UTC) |
| `is_instant` | `false` | `false` | `false` = request lesson, `true` = instant lesson |
| `lesson_count` | `1` | `1` | Number of lessons in this order |
| `im_type` | `"Z"` | `"Z"` | `"Z"` = Zoom |
| `student_id` | number | number | Your user ID |

**Response (verified Aug 24):**
```json
{"order_management_id": "2203351374518667584"}
```

| Field | Type | Notes |
|---|---|---|
| `order_management_id` | string | Order ID — use this in the payment URL |

### 3. Pay for order

```
POST https://api.italki.com/api/v3/orders/{order_management_id}/payment
Content-Type: application/json
X-Token: <i_token>
```

**Body:**
```json
{ "no_use_balance": 0 }
```

| Field | Value | Notes |
|---|---|---|
| `no_use_balance` | 0/1 | `0` = use credits (default), `1` = skip credits and pay out-of-pocket |

**Response (verified Aug 24):**
```json
{
  "order_management_id": "2203351374518667584",
  "order_status": 1,
  "order_type": 11,
  "price": 700,
  "creator_id": 31626937,
  "owner_id": 31626937,
  "teacher_id": 11842092,
  "operator_type": 1,
  "order_request": {
    "lesson_info": {
      "lesson_type": "1",
      "is_instant": 0,
      "lesson_count": 1,
      "lesson_duration": 2,
      "time_start_list": ["2026-08-26T16:00:00+00:00"],
      "im_type": "Z",
      "course_price_id": 783288,
      "course_info": { "course_id": 215953, "title": "Conversational skills", ... },
      "student_id": 31626937,
      "teacher_id": 11842092,
      "language": "english"
    },
    "order_source": ""
  },
  "order_result": {
    "lesson_info": {
      "lesson_ids": [7718569708],
      "package_id": 0
    }
  },
  "create_time": "2026-08-25T02:11:43+00:00",
  "update_time": "2026-08-25T02:11:44+00:00",
  "expiration_time": "2026-08-25T02:31:44+00:00"
}
```

| Field | Type | Notes |
|---|---|---|
| `order_status` | number | `1` = paid/active |
| `price` | number | Total price in cents (e.g., `700` = $7.00) |
| `order_result.lesson_info.lesson_ids` | array | **Session IDs created** — `lesson_ids[0]` is the session ID |
| `expiration_time` | ISO 8601 | Order expiration (20 min from creation in observed capture) |

### 4. Post-booking endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v2/session/first_lesson_check?session_id={id}` | GET | First-lesson check (returns whether this is student's first lesson with teacher) |
| `/api/v2/session/trial_info` | GET | Trial eligibility info (`trial_count`, `free_trial_count`, `can_refund_session_id`, `refund_end_time`, `lesson_completed_count`) |
| `/api/v3/lesson/simples?ids={id}&kind=lesson` | GET | Lightweight lesson details (id, name, status, start_time, user_list, duration, im_data) |
| `/api/v3/lesson/trial_expectation/lesson/{id}` | GET | Trial expectation state (`is_trial_lesson`, `has_saved_expectation`, `selected_expectation_items`, `survey_submitted`) |
| `/api/v3/lesson/trial_expectation/save` | POST | Save trial expectation. Body: `{"lesson_id": <id>, "selected_expectation_items": ["TRIO091"]}` |
| `/api/v3/finance/payment/configs?source_type={s}&itc={price}` | GET | Payment method configs |
| `/api/v2/finance/payment/one_step/list_v2` | GET | One-step payment methods list |
| `/api/v2/finance/payment/config/user_bill_country_region` | GET | User's billing country/region |
| `/api/v3/teacher/{id}/monthly_schedule?year={Y}&month={M}&user_timezone={IANA}` | GET | Monthly calendar view (v3, new) |
| `/api/v2/session/{id}/time_change?start_time={ISO}&end_time={ISO}` | GET | Available slots for reschedule (verified Aug 22) |
| `/api/v2/session/{id}` | POST | Submit session action (reschedule, cancel, confirm) (verified Aug 22 + Aug 26) |
| `/api/v2/session/{id}/history` | GET | Status change timeline (verified Aug 22) |
| `/api/v2/session/{id}?version=1` | GET | Session detail with version param (verified Aug 22) |
| `/api/v3/lesson/{id}/summary` | GET | Lesson summary (verified Aug 22) |
| `/api/v3/lesson/{id}/summary/entrance` | GET | Summary entrance (verified Aug 22) |
| `/api/v3/lesson/{id}/notes` | GET | Lesson notes (verified Aug 22) |
| `/api/v3/flashcard/ai_flashcard?business_id={id}&business_kind=LESSON_SUMMARY` | GET | AI flashcards (verified Aug 22) |
| `/api/v3/activity_manager/homework?session_id={id}` | GET | Homework (verified Aug 22) |
| `/api/v3/activity_manager/lesson_practice/entrance?lesson_id={id}` | GET | Lesson practice entrance (verified Aug 22) |
| `/api/v3/booking/teachers?teacher_ids={id}&skip_last_request_lesson=1` | GET | Booking teacher info (verified Aug 22) |
| `/api/v3/lesson/{id}/recording_consent_popup` | GET | Recording consent popup (verified Aug 22) |
| `/api/v2/me/lesson_count?session_tag=completed&teacher_id={id}` | GET | Lesson count with specific teacher (verified Aug 22) |

### Lesson status enum (verified from JS source + API)

Full status enum from italki JS bundle (`29508-*.js`, module 17007, export `qb`):

| `status` | `group` | `session_label_code` | Meaning | Evidence |
|---|---|---|---|---|
| `"0"` | `"waiting"` | `TP793` | Pending teacher acceptance (just booked) | HAR + API |
| `"1"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"2"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"3"` | `"action_required"` | `TP791` | Teacher requested time/price change | JS usage: "Time change" / "Price change" |
| `"4"` | `"canceled"` | `TP755` | Declined (canceled with previous session) | JS: `status===4` → "declined" |
| `"5"` | `"waiting"` | `TP793` | Reschedule requested, pending acceptance | HAR + API |
| `"6"` | `"upcoming"` | `TP757` | Teacher accepted, lesson confirmed | HAR + API |
| `"7"` | `"action_required"` | `TP751` | Confirmation needed (confirm within 3 days) | JS: "Confirm the lesson within 3 days" |
| `"9"` | `"action_required"` | ? | Cancellation request sent | JS: "cancellation request has been sent" |
| `"C"` | `"action_required"` | `TP794` | Lesson incomplete / in dispute | JS: "Lesson incomplete" |
| `"E"` | ? | `TP792` | Resolved (dispute) | JS: `["E","P"]` → "resolved" |
| `"F"` | `"completed"` | `TP752` | Lesson completed | API (verified Aug 15) |
| `"G"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"H"` | `"action_required"` | `TP798` | Dispute settlement (waiting for italki decision) | JS: "dispute settlement" |
| `"O"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"P"` | ? | `TP792` | Resolved (dispute) | JS: `["E","P"]` → "resolved" |
| `"Q"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"S"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"W"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"X"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |
| `"Z"` | ? | ? | Unknown — in enum, never referenced in JS | JS enum only |

**7 values have unknown meanings** (1, 2, G, O, Q, S, W, X, Z) — in the enum but never used in captured JS.

`operate_deadline` field = teacher's acceptance deadline (ISO 8601). Trial captured: 2 days from booking. On reschedule, `operate_deadline` updates to the new proposed start time.

When status is `"5"` (reschedule pending):
- `session_start_time` = original time (unchanged)
- `new_session_start_time` = proposed new time
- `action_desc` = `status5_S_self-change`
- Actions available: `student_cancel_reschedule_request` (CO301), `student_change_time_again` (TS106)

### Group enum (verified from JS source + API)

From italki JS bundle (`29508-*.js`, module 17007, export `km`):

| Value | JS name | Evidence |
|---|---|---|
| `action_required` | ActionRequired | JS enum + `all_kind_count` API |
| `canceled` | Canceled | JS enum + `all_kind_count` API |
| `completed` | Completed | JS enum + `all_kind_count` API |
| `upcoming` | Upcoming | JS enum + `all_kind_count` API |
| `waiting` | Waiting | JS enum + `all_kind_count` API |
| `unscheduled` | — | `all_kind_count` API only (not in JS enum) |

### session_label_code enum (verified from JS i18n map)

From italki JS bundle (`63922-*.js`, i18n translation map):

| Code | Label |
|---|---|
| `TP751` | Confirmation needed |
| `TP752` | Completed |
| `TP754` | Currently live |
| `TP755` | Canceled |
| `TP757` | Upcoming |
| `TP791` | Action required |
| `TP792` | Resolved |
| `TP793` | Waiting |
| `TP794` | Dispute |
| `TP797` | Reschedule needed |
| `TP798` | In dispute |
| `TP799` | Unscheduled |

### Trial expectation codes (verified from JS source)

From italki JS bundle (`page-5665b8ae4ff88e91.js`):

| Code | Label |
|---|---|
| `TRIO090` | Check my level |
| `TRIO091` | Understand the teaching style |
| `TRIO092` | Build a learning plan |
| `TRIO093` | Teach me something |
| `TRIO094` | Discuss my learning goal |
| `TE994` | Others |

### Reschedule flow (verified Aug 22, 2026 — HAR capture)

**1. Fetch available slots for reschedule:**

```
GET https://api.italki.com/api/v2/session/{session_id}/time_change?start_time={ISO}&end_time={ISO}
```

**Auth required.** Returns teacher's `available_schedule` + `teacher_lesson` (booked overlaps) for the date range — same structure as the schedule endpoint, scoped to a single session's reschedule window.

| Param | Type | Notes |
|---|---|---|
| `start_time` | ISO 8601 | Window start (URL-encoded) |
| `end_time` | ISO 8601 | Window end (URL-encoded) |

Response includes `minimum_request_time_interval: 720` (minutes = 12 hours before lesson — minimum lead time for reschedule).

**2. Submit reschedule request:**

```
POST https://api.italki.com/api/v2/session/{session_id}
Content-Type: application/json
X-Token: <i_token>
```

**Body (reschedule):**
```json
{
  "status": "6",
  "action": "student_change_time_after_deduct",
  "need_other_params": 1,
  "last_operate_time": "2026-08-22T17:39:39+00:00",
  "new_session_time": "2026-08-24T09:30:00-05:00",
  "extra_params": {
    "code": "TS106",
    "primary_level": 3,
    "lesson_time_after": "2026-08-23T06:00:23+00:00"
  },
  "pwd_token": ""
}
```

| Field | Value | Notes |
|---|---|---|
| `status` | `"6"` | Current session status (before action) |
| `action` | `"student_change_time_after_deduct"` | Reschedule action (from `action_list`) |
| `need_other_params` | 1 | Whether extra params required (from `action_list`) |
| `last_operate_time` | ISO 8601 | From session detail's `last_operate_time` |
| `new_session_time` | ISO 8601 with tz offset | Proposed new time (e.g., `2026-08-24T09:30:00-05:00` = Bogota) |
| `extra_params.code` | `"TS106"` | Action code (from `action_list`) |
| `extra_params.primary_level` | number | From `action_list` |
| `extra_params.lesson_time_after` | ISO 8601 | Server time + buffer |
| `pwd_token` | string | Empty for non-password-protected actions |

**Response:**
```json
{
  "data": {
    "success": 1,
    "pwd_token": "",
    "next_status": "5",
    "show_trustpilot_invite": false,
    "review_platform": null
  },
  "success": 1
}
```

`next_status: "5"` = reschedule pending teacher acceptance.

**3. Session history:**

```
GET https://api.italki.com/api/v2/session/{session_id}/history
```

Returns timeline of status changes:

```json
{
  "data": {
    "history": [
      {
        "code_params": [{"code": "TP912", "param": null}],
        "status": "5",
        "operator": 1,
        "create_time": "2026-08-22T18:00:42+00:00",
        "history_id": 245773208
      },
      {
        "code_params": [{"code": "TP916", "param": 4482591708}],
        "status": "6",
        "operator": 2,
        "create_time": "2026-08-22T17:39:39+00:00",
        "history_id": 245772422
      },
      {
        "code_params": [{"code": "TP981", "param": 4482591708}],
        "status": "0",
        "operator": 1,
        "create_time": "2026-08-22T17:38:42+00:00",
        "history_id": 245772385
      }
    ],
    "is_completed": 0
  }
}
```

| `operator` | Meaning |
|---|---|
| `1` | Student |
| `2` | Teacher |

History codes: `TP981` = lesson created, `TP916` = teacher accepted, `TP912` = reschedule requested.

### Session actions (POST /v2/session/{id})

The `POST /api/v2/session/{session_id}` endpoint is a generic action endpoint. The `action` field determines what happens. Actions come from the session detail's `action_list`:

| Action | Code | Status → | Meaning |
|---|---|---|---|
| `student_change_time_after_deduct` | TS106 | `6` → `5` | Reschedule lesson (after teacher accepted) |
| `student_cancel_after_deduct` | TP140 | `6` → ? | Cancel lesson (after teacher accepted) |
| `student_cancel_reschedule_request` | CO301 | `5` → `6` | Cancel reschedule request |
| `student_change_time_again` | TS106 | `5` → `5` | Change time again (new reschedule) |
| `student_complete_and_comment` | LV001 | `7` → `F` | Confirm lesson (student confirms completion) |

Body structure is the same for all actions — `status`, `action`, `need_other_params`, `last_operate_time`, `extra_params` (from `action_list`), `pwd_token`. The confirm action (`student_complete_and_comment`) additionally sends `score`, `student_comment`, `basic_tags`, `normal_tags`, `personal_tags` (all empty/zero for confirm-only without review — verified Aug 26 from HAR).

### session_type / lesson_type enum (verified from JS source)

`session_type` and `lesson_type` use the **same enum**. Verified from italki JS bundle (`29508-*.js`):

```javascript
(r = m || (m = {})).Single = "1", r.Package = "2", r.Trial = "3", r.Instant = "4"
```

| Value | Name | Evidence |
|---|---|---|
| `"1"` | Single (regular lesson) | JS enum. Booking success message: "booked the lesson" (TRA018) |
| `"2"` | Package | JS enum. Booking success message: "booked the package" (TRA055) |
| `"3"` | Trial | JS enum + HAR booking + `lesson/simples` name "Trial Lesson" (CO28) |
| `"4"` | Instant | JS enum. JS: `"4"===session_type` treated same as `is_instant=1` (TE253) |

**Verified Aug 22, 2026** from JS source + HAR + session detail API calls.

### order_type (verified Aug 24 — both trial and single)

`11` for **both** trial and single lesson bookings (verified from two HAR captures). Enum definition not found in JS, but `11` is the only value observed. Other values TBD (package?).

### source_type (partially verified)

`5` = booking (verified from HAR `coupon/verify` calls for both trial and single). Enum not found in JS. Other values TBD.

### im_type codes (verified from JS source)

Verified from italki JS bundle (`29508-*.js` enum + `37991-*.js` icon map). The enum includes `"Z"` but the icon map only covers `"A"` = Zoom.

| Code | IM Name | Status | In icon map |
|---|---|---|---|
| `"1"` | Skype | Active | Yes |
| `"T"` | Teams | Active | Yes |
| `"6"` | Google Meet | Active | Yes |
| `"8"` | FaceTime | Active | Yes |
| `"9"` | Wechat | Active | Yes |
| `"A"` | Zoom | Active | Yes |
| `"Z"` | Unknown (likely Zoom variant) | Active | No |
| `"2"` | MSN Messenger | Legacy | No |
| `"3"` | Yahoo! Messenger | Legacy | No |
| `"4"` | AOL Instant Messenger | Legacy | No |
| `"5"` | ICQ | Legacy | No |
| `"7"` | QQ | Active | Yes |

**`"Z"` vs `"A"`:** Both are in the JS enum. API bookings return `"Z"` for Zoom, but `teacher_im_tools` uses `"A"`. `"Z"` may be a booking-specific code (the booking payload sends `im_type: "Z"`), while `"A"` is the profile/display code. Both likely resolve to Zoom.

### Trial expectation codes

See the [Trial expectation codes](#trial-expectation-codes-verified-from-js-source) section above for the full list (TRIO090-TRIO094 + TE994).

## Price field reference

All prices in the API are in **cents** (USD). Divide by 100 for dollars.

| API field | Unit | Example | USD |
|---|---|---|---|
| `course_info.trial_price` | cents | 1000 | $10.00 |
| `course_info.min_price` | cents | 1500 | $15.00 |
| `pro_course_detail[].session_price` | cents | 1500 | $15.00 |
| `price_list[].session_price` | cents | 1000 | $10.00 |
| `price_list[].package_price` | cents | 5000 | $50.00 |

## Session length reference

`session_length` field uses 15-minute units:

| Value | Minutes |
|---|---|
| 2 | 30 |
| 3 | 45 |
| 4 | 60 |
| 6 | 90 |

## Language level reference

`level` field in `teach_language` and `also_speak`:

| Value | Level |
|---|---|
| 1 | A1 (Beginner) |
| 2 | A2 (Elementary) |
| 3 | B1 (Intermediate) |
| 4 | B2 (Upper Intermediate) |
| 5 | C1 (Advanced) |
| 6 | C2 (Proficient) |
| 7 | Native/Bilingual |

## Course category codes

Verified from italki JS source + API testing (Aug 2026). Only 7 categories have teachers for English:

| Code | Name | English teachers |
|---|---|---|
| CA001 | Language Essentials | 3180 |
| CA002 | Business | 475 |
| CA003 | Test Preparation | 455 |
| CA004 | Kids | 318 |
| CA005 | Conversation | 3278 |
| CA067 | Medical | 38 |
| CA068 | Technology | 39 |

See the filter fields table above for the full tag list per category.

## Sources

| Repo | What it provides | Status |
|---|---|---|
| [mludv/italki_teachers](https://github.com/mludv/italki_teachers) | v2 teachers search endpoint (POST) | Verified working |
| [PatriceVignola/italki-api](https://github.com/PatriceVignola/italki-api) | Old v1 user endpoint + Flow types | v1 deprecated (404), types useful |
| [bigl34/claude-code-plugin-italki](https://github.com/bigl34/claude-code-plugin-italki) | Full implementation: API client + browser client (login, availability, booking) + CLI + types | Reference for auth + booking |

## What we verified vs what we still need

### Verified (tested Aug 14-15, 2026)

- ✅ `POST /api/v2/teachers` — search, pagination (pages 1-100 reachable), server-side filters work, no server-side sort
- ✅ `GET /api/v2/teacher/{id}` — full profile with all fields documented
- ✅ `GET /api/v2/teacher/{id}/schedule` — availability calendar, supports `start_time`/`end_time` date range params (default 7 days, max tested 28 days)
- ✅ `GET /api/v2/teacher/{id}/lesson_reviews` — paginated reviews, language filter, Teacher's picks first, page_size max 100
- ✅ `GET /api/v2/user/{id}` — user profile (non-teacher data)
- ✅ `POST /api/v2/teachers/filter` — metadata only (count, price histogram), not useful for CLI
- ✅ Price fields in cents, session_length in 15-min units
- ✅ `POST /api/v2/loginviaemail` — pure HTTP login with AES signature, returns `i_token` (verified Aug 15)
- ✅ `GET /api/v2/finance/common/overview/student` — credit balance with `X-Token` auth (verified Aug 15)
- ✅ `GET /api/v3/lesson/future_lessons` — upcoming lessons, bare array (verified Aug 15)
- ✅ `GET /api/v3/lesson/past_lessons?length=N` — past lessons, bare array (verified Aug 15)
- ✅ `GET /api/v3/im/user_conversations?version=1&limit=N` — message conversations, bare array (verified Aug 15)
- ✅ `GET /api/v2/user/{id}?has_detail=1` — full user profile with languages, membership, purpose (verified Aug 15)
- ✅ `GET /api/v2/me/foundation` — current user profile without ID (verified Aug 15)
- ✅ `GET /api/v2/me/lesson_count` — total session count (verified Aug 15)
- ✅ `GET /api/v3/lesson/me/lesson_amount` — lesson amount (verified Aug 15)
- ✅ `GET /api/v2/user/{id}/teacher_list` — your teachers (verified Aug 15)
- ✅ `GET /api/v2/united_lessons` — paginated lesson history with filters (verified Aug 15)
- ✅ `GET /api/v2/united_lessons/filters` — available filter options (verified Aug 15)
- ✅ `GET /api/v2/united_lessons/all_kind_count` — lesson counts by status (verified Aug 15)
- ✅ `GET /api/v2/user/my_calendar` — calendar with booked lessons (verified Aug 15)
- ✅ `GET /api/v3/users/profiles?user_ids=...` — batch user profiles (verified Aug 15)
- ✅ `GET /api/v3/lesson/learning_analytics` — streaks, totals, practice (verified Aug 15)
- ✅ `GET /api/v2/teacher/{id}/simple_schedule` — schedule with timezone param, no auth needed (verified Aug 15)
- ✅ `GET /api/v2/session/{id}` — full lesson detail by session ID (verified Aug 15)
- ✅ `POST /api/v3/orders` — create booking order, returns `order_id` (verified Aug 22 via HAR)
- ✅ `POST /api/v3/orders/{id}/payment` — pay for order with `no_use_balance` flag (verified Aug 22 via HAR)
- ✅ `GET /api/v2/finance/coupon/verify` — price preview with/without credits (verified Aug 22 via HAR)
- ✅ `GET /api/v3/lesson/simples?ids={id}&kind=lesson` — lightweight lesson details (verified Aug 22 via HAR)
- ✅ `GET /api/v3/lesson/trial_expectation/lesson/{id}` — trial expectation state (verified Aug 22 via HAR)
- ✅ `POST /api/v3/lesson/trial_expectation/save` — save trial expectation (verified Aug 22 via HAR)
- ✅ `GET /api/v2/session/trial_info` — trial eligibility info (verified Aug 22 via HAR)
- ✅ `GET /api/v3/teacher/{id}/monthly_schedule` — monthly calendar view (verified Aug 22 via HAR)
- ✅ Lesson status transitions: `"0"`/`"waiting"` → `"6"`/`"upcoming"` → `"F"`/`"completed"` + `"5"`/`"waiting"` (reschedule) (verified Aug 22)
- ✅ `session_type` / `lesson_type` enum: `"1"`=Single, `"2"`=Package, `"3"`=Trial, `"4"`=Instant (verified Aug 22 from JS source + HAR)
- ✅ `im_type` codes: `"1"`=Skype, `"T"`=Teams, `"6"`=Google Meet, `"8"`=FaceTime, `"9"`=Wechat, `"A"`=Zoom, `"2"`-`"5"`=legacy (verified Aug 22 from JS source)
- ✅ `course_price_id`: `-1` = trial, real IDs from `price_list` for regular/package (verified Aug 22 from teacher profile + HAR)
- ✅ `GET /api/v2/session/{id}/time_change` — available slots for reschedule (verified Aug 22 via HAR)
- ✅ `POST /api/v2/session/{id}` — submit session action (reschedule, cancel, confirm) (verified Aug 22 + Aug 26 via HAR)
- ✅ `GET /api/v2/session/{id}/history` — status change timeline (verified Aug 22 via HAR)
- ✅ `GET /api/v3/lesson/{id}/summary` — lesson summary (verified Aug 22 via HAR)
- ✅ `GET /api/v3/lesson/{id}/notes` — lesson notes (verified Aug 22 via HAR)
- ✅ `GET /api/v3/activity_manager/homework` — homework (verified Aug 22 via HAR)
- ✅ `GET /api/v3/activity_manager/lesson_practice/entrance` — lesson practice entrance (verified Aug 22 via HAR)
- ✅ `GET /api/v3/booking/teachers` — booking teacher info (verified Aug 22 via HAR)
- ✅ `GET /api/v3/lesson/{id}/recording_consent_popup` — recording consent (verified Aug 22 via HAR)
- ✅ `GET /api/v2/me/lesson_count?session_tag=completed&teacher_id={id}` — lesson count with teacher (verified Aug 22 via HAR)
- ✅ Auth method: token-based (`X-Token` header), not cookie-based
- ✅ v3 API exists — lesson + IM endpoints return bare arrays (no `{meta, data, success}` wrapper)
- ✅ `POST /api/v3/orders` — create order (trial + single verified Aug 22 + Aug 24). `order_type` always `11`. Response: `{"order_management_id": "..."}`
- ✅ `POST /api/v3/orders/{id}/payment` — pay order (verified Aug 24). Response includes `order_result.lesson_info.lesson_ids[0]` = session ID
- ✅ `order_type` = `11` for both trial and single lessons (verified Aug 24 from non-trial HAR)
- ✅ `source_type` = `5` for both trial and single (verified Aug 24)
- ✅ Non-trial booking: `lesson_type=1`, `course_price_id` from teacher's `price_list` (verified Aug 24)

### Still unknown (need auth to test)

- ❓ Token expiration time for `i_token`
- ❓ Wrong password behavior with correct signature (Cloudflare rate-limited before testing)
- ❓ `order_type` enum — only `11` observed (trial + single). Package value TBD
- ❓ Instant lesson booking — `is_instant: true` flow
- ✅ Confirm lesson flow — `student_complete_and_comment` action (LV001) verified Aug 26 via HAR. Body includes `score`, `student_comment`, `basic_tags`, `normal_tags`, `personal_tags` (empty for confirm-only). Status `7` → `F`.
- ❓ `im_type: "Z"` vs `"A"` discrepancy (API returns "Z", JS maps "A" = Zoom)
- ❓ Full `TRIO*` trial expectation code list (only `TRIO091` observed)
- ❓ Favorites endpoint
- ❓ Message/chat send endpoint (read verified, write unknown)
