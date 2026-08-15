# Known Gaps — italki-cli

> Verification status per module. Statuses: `runtime-verified` (ran against live API this codebase's lifetime),
> `unit-tested-only`, `aspirational` (planned, not built).
> Update this file whenever a module's status changes. Last audit: 2026-08-15.

## Verification status

All modules `runtime-verified`.

## Known gaps

| Gap | Impact | Plan |
|---|---|---|
| `--all` on unfiltered search takes ~15s | Expected — 44 pages, 15 concurrent, Zod parsing on 4356 records | None; document if users complain |
| Booking (Phase 3) | `book` doesn't exist | Phase 3 — HTTP booking with `i_token` (needs HAR capture of real booking flow) |
