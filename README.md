# italki-cli

> Search, compare, and track italki lessons — from the terminal, with LLM support via MCP.

italki has no official API. Every endpoint, filter, and enum value in this tool was
reverse-engineered from the public web API and verified by testing real requests.

## Disclaimer

This project is **unofficial** and not affiliated with, endorsed by, or sponsored by italki
HK Limited or Lingbe, S.L. It was built for **educational and personal-use purposes** — to
explore reverse-engineering of undocumented APIs, runtime validation with Zod, and
architecture patterns for CLI/MCP tools.

**italki's Terms of Service** (effective 11 Dec 2025, https://www.italki.com/tos) restrict
activities that this tool performs. Section 12.2 prohibits, among other things:

- 12.2.3 — using robots, spiders, or automated means to access, retrieve, scrape, or index the Platform
- 12.2.4 — reverse engineering any portion of the Platform
- 12.2.6 — recording, processing, or mining information about other Members
- 12.2.7 — accessing the Platform by means other than the public interfaces provided

By using this tool you accept that you may be violating italki's Terms of Service and that
enforcement (including account suspension or termination) is at italki's sole discretion.
**Use at your own risk.** Recommended posture:

- **Personal, low-volume, authenticated use** of your own account data is the lowest-risk path.
- **Do not bulk-scrape** the teacher directory or run high-rate automated requests.
- **Do not expose** the MCP server to other users — that crosses from
  personal use into a third-party service.

This project does not redistribute italki Content. All data is fetched live from italki's
API at runtime and used locally by the user running the tool.

**Open to collaboration:** if you work at italki and would like to discuss integrating any
of this functionality officially, formalizing an API, or having this project taken down in
exchange for an official path, please open an issue or reach out. The author would rather
collaborate than operate in the gray.

## Why

The goal is to handle italki through a CLI and LLM tools — search tutors, compare,
filter, and track lessons without the web UI. This CLI gives you:

- **Teacher search** with all server-side filters (price, country, language, category, availability)
- **Teacher profiles** with courses, pricing, and stats in one command
- **Side-by-side comparison** of multiple teachers
- **Availability calendars** with timezone conversion
- **Reviews** with pagination
- **Account access** — balance, profile, learning stats, lesson history (requires login)
- **JSON output** (`--json`) for piping to `jq`, scripts, or LLM tools
- **MCP server** for AI tools (Claude Desktop, Cursor) — structured tool calls, not screen scraping

## Install

Not published — personal-use tool (see ToS disclaimer below). Run locally with Bun:

```bash
git clone <repo-url> && cd italki-cli
bun install
bun run index.ts search english
```

## Usage

```bash
# Search English teachers
italki search english

# Search with filters
italki search english --type pro --country US --speaks spanish --max-price 20

# Top 5 by rating across all matches (fetches all pages, sorts client-side)
italki search english --all --sort rating --limit 5

# Get a teacher's full profile
italki teacher 1518723
italki teacher 1518723 --courses   # show course list with pricing
italki teacher 1518723 --courses --packages  # include package discounts
italki teacher 1518723 --stats     # education, certifications, experience, session stats
italki teacher 1518723 --schedule  # show next 3 available slots (7-day preview)
italki teacher 1518723 --json      # raw JSON for piping

# Check availability (4-week window, with timezone conversion)
italki schedule 1518723
italki schedule 1518723 --timezone America/Bogota

# Read reviews (page 2, 10 per page)
italki reviews 1518723 --page 2
italki reviews 1518723 --language english   # filter by lesson language

# Compare teachers side-by-side
italki compare 9159592 32917414

# Login (saves session token + timezone to ~/.italki/config.json)
italki login --email you@example.com --password 'yourpass'

# Check your credit balance
italki balance

# Show your profile + learning stats
italki whoami

# Show your lesson history
italki lessons                  # all lessons
italki lessons --past           # completed only
italki lessons --upcoming       # upcoming only
italki lessons --limit 5        # first 5
italki lessons --all            # fetch all pages (up to 1000)

# Logout (clears saved session)
italki logout

# JSON output for piping
italki search english --json | jq '.data[].user_info.nickname'
```

**Output modes:** terminal → human-readable with colors (disable with `NO_COLOR=1`). Piped → JSON automatically, no flag needed — LLM tools and scripts get structured data by default.

## MCP server

`italki mcp` starts a stdio MCP server exposing the same services as the CLI, for AI tools
(Claude Desktop, Cursor, etc.):

```json
// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "italki": { "command": "bun", "args": ["run", "/path/to/italki-cli/index.ts", "mcp"] }
  }
}
```

| Tool | Description | Auth? |
|---|---|---|
| `search_teachers` | Search by language with filters + client-side sort + `all` for full fetch | No |
| `get_teacher` | Full teacher profile (bio, courses, pricing, stats, education) | No |
| `get_schedule` | Availability calendar (default 28 days, `days` param adjustable). Raw JSON — `available_schedule` contains booked sessions, subtract `teacher_lesson` for free time | No |
| `get_reviews` | Paginated student reviews | No |
| `compare_teachers` | Fetch 2+ teacher profiles in parallel for side-by-side comparison | No |
| `get_balance` | Credit balance (ITC) | Yes |
| `get_whoami` | Profile + learning languages + analytics (lessons, hours, streaks) | Yes |
| `get_lessons` | Lesson history with client-side `--past`/`--upcoming`/`--all`/`--limit` filters | Yes |

All tools return Zod-validated JSON.

## Filters

All filters are verified working against the italki API (no auth required):

| Flag | Values | Example |
|---|---|---|
| `--type` | `pro`, `tutor` | `--type pro` |
| `--country` | ISO country code(s) | `--country US,GB,CA` |
| `--speaks` | Language slug(s) — AND logic | `--speaks spanish,portuguese` |
| `--max-price` | Dollars | `--max-price 20` ($20) |
| `--min-price` | Dollars | `--min-price 5` ($5) |
| `--native` | Flag — native speakers only | `--native` |
| `--category` | Category slug(s) | `--category conversation` |
| `--tags` | Tag code(s) | `--tags T0090` (Programming) |
| `--has-trial` | Flag — teachers with trial lessons | `--has-trial` |
| `--instant` | Flag — instant lesson available | `--instant` |
| `--recording` | Flag — italki Plus AI summaries enabled | `--recording` |
| `--available-72h` | Flag — available in next 72 hours | `--available-72h` |
| `--weekday` | Day names: mon,tue,wed,thu,fri,sat,sun | `--weekday mon,tue,wed` |
| `--limit` | Show only first N results | `--limit 5` |
| `--sort` | `rating`, `price`, `sessions`, `name` (client-side) | `--sort rating` |
| `--all` | Fetch all pages before sorting/limiting (batched, rate-limited) | `--all --sort rating --limit 10` |

See `docs/api-reference.md` for the full category and tag list (95 T tags + 4 kids tags verified).

### Reviews filters

| Flag | Values | Example |
|---|---|---|
| `--page` | Page number (default 1) | `--page 2` |
| `--page-size` | Reviews per page (default 10, max 100) | `--page-size 50` |
| `--language` | Filter by lesson language slug | `--language english` |
| `--allow-empty` | Include reviews with no text (default: excluded) | `--allow-empty` |

## Architecture

```
User runs: italki search english --type pro

  ┌─────────┐    args     ┌───────────┐    fetch   ┌───────────┐
  │  CLI    │ ──────────> │  command  │ ─────────> │  service  │
  │ (citty) │             │ (search)  │            │ (search)  │
  └─────────┘             └─────┬─────┘            └─────┬─────┘
                                │                        │
                                │ result                 │ JSON response
                                │                        v
                                │                  ┌───────────┐
                                │                  │  schema   │
                                │                  │  (Zod)    │
                                │                  └─────┬─────┘
                                │                        │
                                │                        │ validated
                                v                        │
                          ┌───────────┐ <────────────────┘
                          │ presenter │
                          │ (format)  │
                          └─────┬─────┘
                                │
                                v
                          ┌───────────┐
                          │  stdout   │
                          │ (TTY/JSON)│
                          └───────────┘
```

**Layers:**

| Layer | Responsibility | Can import from |
|---|---|---|
| `commands/` | Parse args, call service, call presenter | services, presenters, schemas, lib |
| `services/` | API calls — pure functions, no output | schemas, lib |
| `schemas/` | Zod data contracts | nothing |
| `presenters/` | Format output (colors, tables) | schemas, lib |
| `mcp/` | MCP server — tools map 1:1 to services | services, schemas |
| `lib/` | Utilities (color, wrap, time-ago, auth) | constants, schemas |
| `constants.ts` | API URL, headers, enum maps | nothing |

**The separation rule:** `services/` imports only from `schemas/` and `lib/`. Never from
`commands/`, `presenters/`, or any UI library. This makes the core logic reusable by any
interface — CLI today, MCP server or REST API tomorrow — without modifying services.

See [AGENTS.md](./AGENTS.md) for the full architecture contract and engineering rules.

## Tech stack

| Tool | Why |
|---|---|
| [Bun](https://bun.sh) | Dev runtime — fast, native TypeScript |
| [TypeScript](https://typescriptlang.org) | Type safety, strict mode |
| [Zod](https://zod.dev) | Runtime validation of API responses. 50+ nested fields need a schema, not hand-written interfaces. |
| [Citty](https://github.com/unjs/citty) | CLI arg parsing + auto `--help`. ~3KB, works on Bun + Node. |
| [Oxlint](https://oxc.rs) | 5 custom lint rules enforce architecture separation, no-default-export, no-classes-in-services, no-console-in-services, no-generic-filenames. Keys, not prompts. |

**Runs on Bun.** The code uses standard APIs only (`fetch`, `fs/promises`), no runtime-specific code.

## Documentation

- [ROADMAP.md](./ROADMAP.md) — phase plan and target commands
- [AGENTS.md](./AGENTS.md) — architecture contract and engineering rules
- [KNOWN_GAPS.md](./KNOWN_GAPS.md) — verification status and known limitations
- [docs/api-reference.md](./docs/api-reference.md) — all verified API endpoints, headers, and enum values

## References

- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern
- [mludv/italki_teachers](https://github.com/mludv/italki_teachers) — v2 teachers endpoint discovery
- [bigl34/claude-code-plugin-italki](https://github.com/bigl34/claude-code-plugin-italki) — auth + booking research
- [Custom linting rules to guide AI code](https://www.sandromaglione.com/newsletter/custom-linting-rules-to-guide-ai-code) — oxlint custom plugin approach
