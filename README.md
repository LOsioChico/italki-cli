# italki-cli

> Search, compare, and track italki lessons — from the terminal, with LLM support via MCP.

italki has no official API. Every endpoint, filter, and enum value in this tool was
reverse-engineered from the public web API and verified by testing real requests.

## Disclaimer

This project is **unofficial** and not affiliated with, endorsed by, or sponsored by italki
HK Limited or Lingbe, S.L. It was built for **educational and personal-use purposes**.

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

**Open to collaboration:** if you work at italki and want to discuss integrating any of this
functionality officially, formalizing an API, or taking this project down in exchange for an
official path, please open an issue or reach out.

## Install

Not published — personal-use tool. Run locally with Bun:

```bash
git clone <repo-url> && cd italki-cli
bun install
bun run index.ts --help
```

## Usage

```bash
bun run index.ts --help              # list all commands
bun run index.ts <command> --help    # flags for a specific command
```

**Output modes:** human-readable with colors by default (disable with `NO_COLOR=1`). Add `--json` for raw JSON output (script/pipe consumers).

## MCP server

`italki mcp` starts a stdio MCP server for AI tools (Claude Desktop, Cursor):

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
| `search_teachers` | Search by language with filters + client-side sort | No |
| `get_teacher` | Full teacher profile (bio, courses, pricing, stats, education) | No |
| `get_schedule` | Availability calendar (default 28 days, `days` param adjustable) | No |
| `get_reviews` | Paginated student reviews | No |
| `compare_teachers` | Fetch 2+ teacher profiles in parallel | No |
| `get_balance` | Credit balance (ITC) | Yes |
| `get_whoami` | Profile + learning languages + analytics | Yes |
| `get_lessons` | Lesson history with client-side filters | Yes |

All tools return Zod-validated JSON.

## Tech stack

| Tool | Why |
|---|---|
| [Bun](https://bun.sh) | Dev runtime — fast, native TypeScript |
| [TypeScript](https://typescriptlang.org) | Type safety, strict mode |
| [Zod](https://zod.dev) | Runtime validation of API responses. 50+ nested fields need a schema, not hand-written interfaces. |
| [Citty](https://github.com/unjs/citty) | CLI arg parsing + auto `--help`. ~3KB, works on Bun + Node. |
| [Oxlint](https://oxc.rs) | 5 custom lint rules enforce architecture separation. Keys, not prompts. |

## Documentation

- [AGENTS.md](./AGENTS.md) — architecture contract and engineering rules
- [ROADMAP.md](./ROADMAP.md) — phase plan and target commands
- [KNOWN_GAPS.md](./KNOWN_GAPS.md) — verification status and known limitations
- [docs/api-reference.md](./docs/api-reference.md) — all verified API endpoints, headers, and enum values

## References

- [rappi-cli](https://github.com/crafter-station/rappi-cli) — architectural pattern
- [mludv/italki_teachers](https://github.com/mludv/italki_teachers) — v2 teachers endpoint discovery
- [bigl34/claude-code-plugin-italki](https://github.com/bigl34/claude-code-plugin-italki) — auth + booking research
