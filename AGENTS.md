# AGENTS.md — italki-cli Operating Contract

> CLI + MCP server for italki teacher search, profiles, availability, reviews, and lesson tracking.
> Reverse-engineered from public API. No official API docs exist — everything here was verified by testing.

Operating contract for any AI agent (Devin, Claude Code, Cursor) working on this repo.
Read this file before writing code. Nearest `AGENTS.md` wins.

## Communication style (ADHD-friendly)

1. **Lead with the next action.** First line is something the reader can do, not context.
2. **Number multi-step tasks.** Each step is one bounded action. No "and then" twice in one step.
3. **End with one concrete next step.** Not "let me know" — a specific action.
4. **Suppress tangents.** Finish the first issue, then offer the second as a separate question.
5. **Restate state every turn.** One-line status of where things stand before the new action.
6. **Specific time estimates.** "About 15 minutes if tests cover this" — not "a bit".
7. **Make wins visible.** When something works, say so with evidence — don't bury success.
8. **Matter-of-fact errors.** State cause and fix. No "Uh oh" or "Oh no".
9. **Cap lists at 5 items.** Group into sub-lists or split into steps if longer.
10. **No preamble, no recap, no closers.** No "Great question", "Let me...", "Hope this helps".

## Code style (ADHD-friendly)

- **Short files.** One responsibility per file. If a file exceeds ~150 lines, split it.
- **Tables over paragraphs** in docs and comments. Scannable, not readable.
- **Named exports only.** No default exports. Greppable, explicit imports. *(lint-enforced: `italki/no-default-export`)*
- **Flat folder structure.** Max 2 levels deep under `src/`. No `src/services/auth/helpers/utils/`.
- **File names say what's inside.** `search.ts` searches. `teacher.ts` gets a teacher. No `utils.ts`. *(lint-enforced: `italki/no-generic-filenames`)*
- **No walls of text in comments.** If a comment exceeds 3 lines, it's a doc — move it to `docs/`.

## What this project is

A CLI + MCP server for handling italki through the terminal and LLM tools — search, compare,
and track lessons without the web UI. The italki API is undocumented; every endpoint,
filter, and enum value in `docs/api-reference.md` was verified by sending real requests and
checking responses.

**The goal:** let LLMs (Claude, Cursor) and scripts interact with italki through structured
tool calls and JSON output, not screen scraping. Search tutors, filter, compare, and
track lessons — all programmable.

**What it is NOT:** a scraper, or an official italki product. Booking is planned (Phase 3).

## Architecture rules

### The separation rule (NON-NEGOTIABLE)

```
services/  →  schemas/ + lib/ + constants
commands/  →  services/ + presenters/
presenters/ →  schemas/ + constants + lib/
mcp/       →  services/ only
api/       →  services/ only (when added)
```

`services/` never imports from `commands/`, `presenters/`, `@clack/prompts`, or any interface layer.
This is what makes MCP, REST, or any future interface addable without touching services.

If you're tempted to import `@clack/prompts` or `citty` inside `services/`, stop. You're breaking
the separation. Services return data. Interfaces present it.

**Enforced by oxlint** — custom rules in `lint/plugin.js`. Violations are build errors, not just prompt-level suggestions. Run `bun run verify` to check.

| Rule | What it enforces |
|---|---|
| `italki/no-cross-layer-imports` | services/ must not import commands/, presenters/, or UI libs. presenters/ must not import services/, commands/, or UI libs. schemas/ must not import services/, commands/, presenters/, or local files (constants allowed) |
| `italki/no-default-export` | Named exports only (commands/ exempt — citty requires default export) |
| `italki/no-classes-in-services` | Services are pure functions, no classes |
| `italki/no-console-in-services` | Services return data, don't print. Output is the presenter's job |
| `italki/no-generic-filenames` | No `utils.ts`, `helpers.ts`, `misc.ts`. File names say what's inside |

### Design principles

- **Pure functions in services/** — no classes, no global state, no mutation. Config passed as argument. *(lint-enforced: `italki/no-classes-in-services`)*
- **Zod schemas are the source of truth** — API responses validated at runtime. Types inferred from schemas, not hand-written.
- **Honest errors** — never swallow API errors. Surface them with context (endpoint, status, response body).
- **Runtime-agnostic** — standard APIs only (`fetch`, `fs/promises`, `process`). No Bun-specific APIs. Runs on Bun + Node.

### Output rule

Services return plain data. Presenters format it. The `--json` flag is handled in `commands/`, never in services. *(lint-enforced: `italki/no-console-in-services`)*

```
command parses args → service returns data → presenter formats output → stdout
```

When piped (`!process.stdout.isTTY`), default to JSON. When terminal, default to human-readable.

## API knowledge

All verified API knowledge lives in `docs/api-reference.md`. Read it before writing any service.

Key facts that agents get wrong:
- Filters DO work server-side, but the payload structure is nested (`teacher_info`, `teach_language`). Top-level filter fields are ignored.
- `sort_by` does NOT work. All 12 values tested return identical order. Sort client-side.
- `page_size` max is 99 for teachers search (not 20). `page_size=100` returns only 20 items. `page_size>100` errors. **But `united_lessons` page_size max is 50** — different endpoint, different limit.
- `teacher_type` must be a number (1=pro, 2=tutor), not an array. `[1,2]` errors.
- Category→tag pairing is NOT hard-enforced by the API, but cross-category pairs usually return 0.
- `recording_permission` is about italki Plus AI Lesson Summaries, NOT about students recording lessons.
- `united_lessons` `kind` filter is broken — only `all` returns data. Filter client-side.
- `v3/users/profiles` is public (no auth required). `v3/lesson/learning_analytics` requires auth.
- v3 API returns bare arrays/objects (no `{meta, data, success}` wrapper). v2 API uses the wrapper.
- `my_calendar` requires both `start_time` and `end_time` — omit either and get empty array. No range limit (10 years works).
- `teacher/{id}/schedule` supports `start_time` and `end_time` query params (`YYYY-MM-DD` or ISO 8601). Default: 7 days. CLI `schedule` command fetches 28 days, `teacher --schedule` fetches 7 days.
- `teacher/{id}/schedule` `available_schedule` contains booked sessions — `teacher_lesson` overlaps with it by design. CLI subtracts booked sessions and filters sub-slots < 30 min (matches italki JS: 30-min cell splitting).

**CLI abstraction layer:** The CLI uses user-facing slugs, not API codes. `--type pro` maps to `teacher_type: 1`. `--category conversation` maps to `course_category: ["CA005"]`. `--weekday mon,tue` maps to `weekday: [1,2]`. `--courses`/`--stats`/`--packages`/`--schedule` on `teacher` command are opt-in detail flags (default shows compact profile). `--sort`/`--limit`/`--all` on `search` command are client-side post-processing (API doesn't support sort). `--timezone` on `schedule` and `teacher --schedule` converts UTC slots to user's IANA timezone (priority: `--timezone` flag > `config.timezone_iana` from login > `DEFAULT_TIMEZONE`). `--page`/`--page-size` on `reviews` for pagination. Date/time display: shared `formatDateTime` in `lib/time-ago.ts` (24h, weekday, "at" separator, year for past events). Relative time via `timeAgo`/`timeUntil` in parentheses. Duration via `formatDuration` ("30min", "1h15min"). Translation happens in `services/search.ts` via maps in `constants.ts`. `docs/api-reference.md` documents raw API codes — that's API-level truth for service code. The CLI layer is the user-facing truth.

If you're unsure about an API behavior, test it with `curl` first (G13: curl first, code second).

## Dependencies and why each

| Dep | What it solves | Why not alternatives |
|---|---|---|
| `zod` | Runtime validation of API responses. The italki API has 50+ nested fields. Schemas infer TS types. | Hand-written interfaces drift from reality. We verified 95 tag codes, 7 categories, 13 filters — the schema is the contract. |
| `citty` | CLI arg parsing + `--help` generation. | Commander is heavier. Hand-rolling is ~20 lines but no auto-help. Citty is ~3KB, works on Bun + Node. |
| `@modelcontextprotocol/sdk` | MCP server over stdio for AI tools (Claude, Cursor). Same services as CLI, wrapped as JSON-RPC tools. | LLMs can use `--json` CLI output, but MCP gives structured tool calls + schemas. SDK is the official spec implementation. |

**What we deliberately did NOT add:**
- **@clack/prompts** — was installed for interactive browsing, but nothing used it. Removed. Re-add when an interactive flow actually exists. Lint rules still ban it in services/ and presenters/.
- **chalk** — use `Bun.color()` or raw ANSI codes. One less dep for 3-4 colors.
- **Hono** — REST server solves no real problem. CLI covers terminal, MCP covers AI. Add later if needed (~30 lines).
- **cli-table3** — table formatting can be hand-rolled for 4-5 columns. Add if tables get complex.
- **ora** — spinners can be a 5-line ANSI spinner. Add if we have long-running operations.
- **playwright** — not needed. Login API reverse-engineered (2026-08-15), pure HTTP with AES signature. No browser automation.

## Engineering discipline

### Verify before you assert (G2, G12)
Never say "working" or "done" without running `bun run verify` (typecheck + lint) AND the actual command. Show the output.
If you can't test it, say "I believe this should work but I haven't tested it."

### No feature is complete if verify fails
`bun run verify` runs `tsc --noEmit` + `oxlint`. Both must pass with 0 errors.
Custom lint rules enforce all 5 architecture invariants — see the rule table above. These are not style preferences.

### curl first, code second (G13)
Before writing any service function:
1. `curl` the real endpoint
2. Check HTTP status AND response body — some APIs return 200 with errors
3. Only then write the Zod schema + service function

### One change, one verification (G17)
Don't stack 5 changes and then build. After each significant change:
1. Typecheck (`tsc --noEmit`)
2. Run the specific command that changed
3. Only then move to the next change

### No unrequested abstractions (G19)
Shortest working diff wins. Don't add boilerplate, interfaces, or patterns nobody asked for.
If a function is 3 lines, don't extract it. If a type is used once, don't generalize it.

### Read before you edit (G10)
Never edit from memory. Read the file first, then edit. Small edits accumulate silently broken state.

### Fail safe, not silent (G16)
When validation or error handling is ambiguous, default to "invalid" / "failed".
Never default to "valid" without positive confirmation.

### YAGNI ladder (G6)
Before writing code, stop at the first rung that holds:
1. Does this need to exist?
2. Already in codebase?
3. stdlib?
4. native platform (Bun/Node APIs)?
5. installed dep?
6. one line?
7. minimum code that works

### Keys, not prompts
- No API keys in code or commits. Use environment variables or config files.
- Config stored in `~/.italki/config.json` (contains `i_token`). Never commit it. Already in `.gitignore`.
- Telling an agent "don't commit secrets" is a suggestion. If the agent can commit, assume one day it will. Use `.gitignore` + pre-commit hooks as the real boundary.

### Destructive operations
- `rm -rf`, force-push, branch deletion: always stop and describe before running.
- Git push requires explicit user approval. Never push without being asked.
- No co-authoring lines or Devin attribution in commits. Concise messages only.
- Don't auto-commit after every change. Commit when the user asks or at logical milestones.

## Commit conventions

- Concise messages. No body unless the change is non-obvious.
- No `Co-Authored-By` line. No `Generated with Devin` footer.
- Run `bun run verify` before committing. Both typecheck and lint must pass.
- Don't push unless explicitly asked.
- Squash redundant commits before significant milestones. History should read as logical steps, not iterative corrections.

## Interfaces

**CLI:** `src/commands/` — citty-based, auto `--help`. `bun run index.ts --help` lists all commands.

**MCP server:** `src/mcp/server.ts` + `src/mcp/tools.ts`. Imports from `src/services/` only. Registered as `italki mcp` command. 8 tools: search_teachers, get_teacher, get_schedule, get_reviews, compare_teachers (public, no auth); get_balance, get_whoami, get_lessons (require login — return isError if no saved session). Runtime-verified over stdio.

**REST API (future):** Add `src/api/app.ts` with Hono. Import from `src/services/`. Zero changes to services. The separation rule makes REST additive, not invasive.

## References

- `docs/api-reference.md` — verified endpoint documentation (read before writing services)
- `ROADMAP.md` — 3-phase plan with deliverables
- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern reference
