# italki-cli Roadmap

> CLI + MCP server for italki. Reverse-engineered from public API.
> Two interfaces, one core: CLI for terminal, MCP for AI tools.

## Status

| Phase | Goal | Status |
|---|---|---|
| 1 | Public API + CLI + MCP (no auth) | DONE — runtime-verified |
| 2 | Auth (login, balance, whoami, lessons) | DONE — runtime-verified Aug 15, 2026 |
| 3 | Booking | DONE — HAR-verified Aug 24, 2026 (booking flow verified against 2 HARs) |

See `docs/api-reference.md` for all verified endpoints.

## Phase 3: Booking — DONE

**Implemented:**
1. `services/booking.ts` — createOrder, payOrder, getTimeChangeSlots, submitSessionAction, getSessionDetail, getSessionHistory
2. `schemas/booking.ts` — Zod schemas for all booking responses
3. `transforms/booking.ts` — slot subtraction, action result, history timeline
4. `presenters/booking.ts` — ANSI text formatters
5. CLI commands: `italki book`, `italki reschedule`, `italki cancel`, `italki confirm`
6. MCP tools: `book_lesson`, `reschedule_lesson`, `cancel_lesson`, `confirm_lesson`, `get_session_history`
7. `authedFetch` extended to support POST with body

**Verified:**
- `bun run verify` (0 errors)
- `italki book --dry-run` with real teacher (auto-detects language, course_price_id, timezone conversion)
- Booking flow verified against 2 HAR captures (trial Aug 22 + single Aug 24):
  - `order_type` = `11` for both trial and single (was wrong: `1` for single)
  - Response field = `order_management_id` (was wrong: `order_id`)
  - `session_id` in `order_result.lesson_info.lesson_ids[0]` (was wrong: `order_request.session_id`)
- Reschedule flow verified against HAR 2 (Aug 22): action_list lookup from session detail
- Confirm flow verified against HAR (Aug 26): `student_complete_and_comment` action (LV001), status `7` → `F`

**Not yet live-tested via CLI:** createOrder + payOrder POST (code matches HAR exactly, but CLI execution not tested — website booking confirmed the flow works). Reschedule + cancel POST not live-tested. Confirm not live-tested (lesson was already confirmed via web UI before CLI test — CLI correctly reports no confirm action available).

## References

- `docs/api-reference.md` — verified endpoint documentation
- `AGENTS.md` — architecture contract and engineering rules
- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern
