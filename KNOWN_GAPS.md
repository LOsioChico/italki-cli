# Known Gaps — italki-cli

> Verification status per module. Statuses: `runtime-verified` (ran against live API this codebase's lifetime),
> `unit-tested-only`, `aspirational` (planned, not built).
> Update this file whenever a module's status changes. Last audit: 2026-08-26.

## Verification status

All modules `runtime-verified`.

## Known gaps

| Gap | Impact | Plan |
|---|---|---|
| `--all` on unfiltered search takes ~15s | Expected — 44 pages, 50 concurrent, Zod parsing on ~4300 records (count grows daily) | None; document if users complain |
| Booking POST not live-tested via CLI | Code matches HAR exactly (trial + single, Aug 22 + 24). Website booking confirmed the flow works. | Live-test when next booking opportunity arises |
| Reschedule + cancel POST not live-tested | Code matches HAR (Aug 22). Action_list lookup verified. | Live-test when opportunity arises |
| Confirm POST not live-tested | Code matches HAR (Aug 26). Lesson was already confirmed via web UI before CLI test — CLI correctly reports no confirm action available. | Live-test on next action_required lesson |
| Lesson review submission not implemented | HAR captured `POST /v3/lesson/lessons/{id}/reviews_v2` (Aug 26). Confirm flow works without review. | Add if user wants to submit reviews from CLI |
