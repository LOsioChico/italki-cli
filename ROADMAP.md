# italki-cli Roadmap

> CLI + MCP server for italki. Reverse-engineered from public API.
> Two interfaces, one core: CLI for terminal, MCP for AI tools.

## Status

| Phase | Goal | Status |
|---|---|---|
| 1 | Public API + CLI + MCP (no auth) | DONE — runtime-verified |
| 2 | Auth (login, balance, whoami, lessons) | DONE — runtime-verified Aug 15, 2026 |
| 3 | Booking | Not started |

See `docs/api-reference.md` for all 23 verified endpoints.

## Phase 3: Booking

**Goal:** Book sessions from CLI/MCP.

1. Implement `services/booking.ts` — HTTP booking (use `i_token` from Phase 2)
2. Two-stage: preview (dry run) → confirm
3. Payment is always manual (return payment URL for user to complete)
4. Add `italki book` command with `--dry-run` flag
5. Add MCP tool with confirm-before-book safety
6. Test with trial lesson booking

**Deliverable:** `italki book 1518723 --dry-run` shows preview, `italki book 1518723` submits.

## References

- `docs/api-reference.md` — verified endpoint documentation
- `AGENTS.md` — architecture contract and engineering rules
- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern
