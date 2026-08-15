# italki-cli Roadmap

> CLI + MCP server for italki. Reverse-engineered from public API.
> Two interfaces, one core: CLI for terminal, MCP for AI tools.

## What we know (verified Aug 15, 2026)

See `docs/api-reference.md` for full endpoint documentation (23 verified endpoints).

### Public API (no auth)

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/v2/teachers` | POST | Search teachers (page_size max 99, pages 1-100 reachable) |
| `GET /api/v2/teacher/{id}` | GET | Full teacher profile |
| `GET /api/v2/teacher/{id}/schedule` | GET | Availability calendar (time slots) |
| `GET /api/v2/teacher/{id}/reviews` | GET | Student reviews (paginated) |
| `GET /api/v2/user/{id}` | GET | User profile (non-teacher data) |
| `GET /api/v3/users/profiles` | GET | Batch user profiles (public, no auth) |

### Authenticated API (requires `i_token`)

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/v2/loginviaemail` | POST | Login (AES-CBC signature, pure HTTP) |
| `GET /api/v2/me/foundation` | GET | Your profile + languages |
| `GET /api/v2/finance/common/overview/student` | GET | Credit balance |
| `GET /api/v3/lesson/learning_analytics` | GET | Learning stats (streaks, totals) |
| `GET /api/v2/united_lessons` | GET | Lesson history (page_size max 50) |
| `GET /api/v2/user/{id}/teacher_list` | GET | Teachers you've booked with |
| `GET /api/v2/user/my_calendar` | GET | Calendar of booked lessons |
| `GET /api/v2/session/{id}` | GET | Full lesson detail by session ID |

## Phases

### Phase 1: Public API + CLI + MCP (no auth) — DONE

**Goal:** Working CLI for teacher search, profiles, availability, reviews.

1. ✅ Init project: `bun init`, package.json, tsconfig, install deps, oxlint + custom rules
2. ✅ Write Zod schemas for teacher, schedule, review responses
3. ✅ Implement `services/search.ts` — POST /api/v2/teachers with pagination
4. ✅ Implement `services/teacher.ts` — GET /api/v2/teacher/{id}
5. ✅ Implement `services/schedule.ts` — GET /api/v2/teacher/{id}/schedule
6. ✅ Implement `services/reviews.ts` — GET /api/v2/teacher/{id}/reviews
7. ✅ Build CLI commands: `search`, `teacher`, `schedule`, `reviews`, `compare`
8. ✅ Build MCP server with same tools
9. ✅ `bun run verify` passes (typecheck + lint) + all commands runtime-tested

**Deliverable:** `italki search english`, `italki teacher 1518723`, `italki schedule 1518723`, `italki reviews 1518723`, `italki mcp` all working.

### Phase 2: Auth (pure HTTP, no Playwright) — DONE

**Goal:** Login via API, persist session token + user settings.

> Login API reverse-engineered 2026-08-15. Pure HTTP — no browser needed.
> Details in `docs/api-reference.md`.

1. ✅ Implement `services/auth.ts` — AES signature + login API call
2. ✅ Implement `config.ts` — store `i_token` + `timezone_iana` in `~/.italki/config.json`
3. ✅ Implement `italki login` command — flags for email+password, call API, save token + timezone
4. ✅ Add authenticated request helper (`lib/auth.ts` — attaches `X-Token` header)
5. ✅ Update timezone resolution: `--timezone` flag > `config.timezone_iana` > `DEFAULT_TIMEZONE`
6. ✅ `italki balance` — credit balance from finance overview endpoint
7. ✅ `italki whoami` — profile + learning stats from `me/foundation` + `learning_analytics`
8. ✅ `italki logout` — clear saved session
9. ✅ `italki lessons` — lesson history from `united_lessons` (client-side filter: --past/--upcoming)

**Timezone priority (after login):**

| Priority | Source | When |
|---|---|---|
| 1 | `--timezone` flag | Explicit override |
| 2 | `config.timezone_iana` | From italki settings, saved at login |
| 3 | `DEFAULT_TIMEZONE` (`America/Bogota`) | Fallback before first login |

**Deliverable:** `italki login` saves token + timezone to config. `balance` and `whoami` work with saved session. All commands use saved timezone by default. Runtime-verified Aug 15, 2026.

### Phase 3: Booking

**Goal:** Book sessions from CLI/MCP.

1. Implement `services/booking.ts` — HTTP booking (use `i_token` from Phase 2)
2. Two-stage: preview (dry run) → confirm
3. Payment is always manual (return payment URL for user to complete)
4. Add `italki book` command with `--dry-run` flag
5. Add MCP tool with confirm-before-book safety
6. Test with trial lesson booking

**Deliverable:** `italki book 1518723 --dry-run` shows preview, `italki book 1518723` submits.

## CLI commands (current + target)

```
# Public (no auth) — DONE
italki search <language> [options]      Search teachers (--type, --country, --speaks, --max-price, --category, --tags, --weekday, --sort, --limit, --all, --json)
italki teacher <id> [options]           Teacher profile (--courses, --packages, --stats, --schedule, --timezone, --json)
italki schedule <id> [options]          Availability calendar (--timezone, --json)
italki reviews <id> [options]           Teacher reviews (--page, --page-size, --language, --allow-empty, --json)
italki compare <id1> <id2> [id3...]     Compare teachers side-by-side

# Auth — DONE
italki login --email --password         Login (saves token + timezone to ~/.italki/config.json)
italki logout                           Clear saved session
italki balance                          Credit balance
italki whoami                           Profile + learning stats
italki lessons [options]                Lesson history (--upcoming, --past, --limit, --all, --json)

# Server — DONE
italki mcp                              Start MCP server (for Claude/Cursor)
```

## MCP tools

`italki mcp` starts a stdio MCP server with these tools:

| Tool | Description | Auth? | Status |
|---|---|---|---|
| `search_teachers` | Search by language, sort, type | No | ✅ |
| `get_teacher` | Full teacher profile | No | ✅ |
| `get_schedule` | Availability calendar | No | ✅ |
| `get_reviews` | Teacher reviews | No | ✅ |
| `compare_teachers` | Side-by-side comparison | No | ✅ |
| `get_balance` | Credit balance | Yes | ✅ |
| `get_whoami` | Profile + learning stats | Yes | ✅ |
| `get_lessons` | Lesson history | Yes | ✅ |
| `book_session` | Book a session (confirm first) | Yes | Phase 3 |

## References

- `docs/api-reference.md` — our verified endpoint documentation
- `AGENTS.md` — architecture contract and engineering rules
- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern
- [mludv/italki_teachers](https://github.com/mludv/italki_teachers) — v2 teachers endpoint
- [bigl34/claude-code-plugin-italki](https://github.com/bigl34/claude-code-plugin-italki) — auth + booking research
