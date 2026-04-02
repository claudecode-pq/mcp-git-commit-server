# mcp-git-commit-server

MCP server (TypeScript/ESM) that analyzes staged git changes and executes conventional
commits. Single-file implementation; communicates with Claude via stdio transport.

## lean-ctx — Token Optimization

lean-ctx is configured as an MCP server. Use lean-ctx MCP tools instead of built-in tools:

| Built-in              | Use instead  | Why                                                            |
| --------------------- | ------------ | -------------------------------------------------------------- |
| Read / cat / head     | `ctx_read`   | Session caching, 6 compression modes, re-reads cost ~13 tokens |
| Bash (shell commands) | `ctx_shell`  | Pattern-based compression for git, npm, cargo, docker, tsc     |
| Grep / rg             | `ctx_search` | Compact context, token-efficient results                       |
| ls / find             | `ctx_tree`   | Compact directory maps with file counts                        |

For shell commands that don't have MCP equivalents, prefix with `lean-ctx -c`:

```bash
lean-ctx -c git status    # compressed output
lean-ctx -c cargo test    # compressed output
lean-ctx -c npm install   # compressed output
```

### ctx_read Modes

- `full` — cached read (use for files you will edit)
- `map` — deps + API signatures (use for context-only files)
- `signatures` — API surface only
- `diff` — changed lines only (after edits)
- `aggressive` — syntax stripped
- `entropy` — Shannon + Jaccard filtering

Write, StrReplace, Delete have no lean-ctx equivalent — use them normally.

## Commands

```bash
pnpm install              # Install dependencies
pnpm start                # Run MCP server (tsx runs TS directly — no compile step)
pnpm test                 # Run test suite once (vitest run)
pnpm test:watch           # Re-run tests on file change
pnpm test:coverage        # Coverage report → ./coverage/ (v8 provider)
```

## Architecture

All logic in `index.ts` (~163 lines). No compilation required — `tsx` executes TypeScript directly.

**Exported function:**

- `getGroupedChanges()` — runs `git status --porcelain`, classifies each file into a
  conventional commit type and groups by module (top-level directory)

**Two MCP tools registered:**

- `get_staged_analysis` — calls `getGroupedChanges()`, returns JSON keyed by `type(module)`
- `execute_commit` — runs `git add .` then `git commit -m "<message>"` via `execFileSync`
  (shell-injection-safe; unlike `execSync` used in `getGroupedChanges`)

**Type classification** (priority order — first match wins):

```text
test → docs → style → ci → build → chore → perf → refactor → feat (A/?) → fix (fallback)
```

**Module** = first path segment of the changed file (`src/deep/utils.ts` → `src`);
root-level files get module `root`.

## Gotchas

- **`pnpm-lock.yaml` → `fix`** (not `chore`) — the chore rule checks `\.lock$` extension,
  which misses YAML-format lockfiles
- **`package.json` → `build`** (not `chore`) — matched by the build rule's explicit list
- **No server startup in tests** — `main()` is gated by `process.env.VITEST !== 'true'`
- **No `console.log` in tool handlers** — server writes to stdout for MCP transport;
  logging to stdout corrupts the protocol

## Key Files

| File               | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `index.ts`         | MCP server + all tool implementations + `getGroupedChanges()`     |
| `index.test.ts`    | Vitest suite (292 lines) — mocks `execSync`/`execFileSync`        |
| `vitest.config.ts` | Coverage config; only covers `index.ts`, reports to `./coverage/` |
| `package.json`     | pnpm scripts; deps: `@modelcontextprotocol/sdk`, `zod`            |
