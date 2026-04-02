# mcp-git-commit-server

MCP server that analyzes staged git changes and executes conventional commits. Communicates via stdio transport; no compilation required.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- git

## Installation

```bash
git clone https://github.com/claudecode-pq/mcp-git-commit-server.git
cd mcp-git-commit-server
pnpm install
```

## Usage

### As an MCP server (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "git-commit": {
      "command": "pnpm",
      "args": ["--prefix", "/path/to/mcp-git-commit-server", "start"]
    }
  }
}
```

### Run directly

```bash
pnpm start
```

The server communicates over stdio and is designed to be invoked by an MCP client.

## Commands

<!-- AUTO-GENERATED from package.json scripts -->

| Command              | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `pnpm start`         | Run MCP server (tsx executes TypeScript directly — no compile step) |
| `pnpm test`          | Run test suite once                                                 |
| `pnpm test:watch`    | Re-run tests on file change                                         |
| `pnpm test:coverage` | Coverage report → `./coverage/` (v8 provider)                       |

<!-- AUTO-GENERATED -->

## MCP Tools

### `get_staged_analysis`

Returns a token-dense JSON summary of git changes grouped by conventional commit type and module (top-level directory).

**Input:** none

**Output example:**

```json
{
  "feat(src)": ["src/new-feature.ts"],
  "fix(root)": ["index.ts"],
  "docs(root)": ["README.md"]
}
```

---

### `execute_commit`

Stages all files (`git add .`) and executes a git commit with the provided message.

**Input:**

| Field            | Type     | Description                                    |
| ---------------- | -------- | ---------------------------------------------- |
| `commit_message` | `string` | Formatted as `<type>(<module>): <description>` |

**Output:** Success or error message from git.

## Type Classification

Files are classified by the first matching rule (priority order):

<!-- AUTO-GENERATED from index.ts classification logic -->

| Type       | Matches                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`     | Paths containing `test`, `spec`, `__tests__`, `tests/`; filenames matching `*.test.*` / `*.spec.*`                                            |
| `docs`     | Extensions `.md`, `.mdx`, `.txt`, `.rst`, `.adoc`; filenames `README`, `CHANGELOG`, `LICENSE`, `CONTRIBUTING`, `WIKI`; paths under `docs/`    |
| `style`    | Extensions `.css`, `.scss`, `.sass`, `.less`, `.styl`; paths containing `.styled.`                                                            |
| `ci`       | Paths under `.github/workflows`, `.github/actions`, `.circleci`, `.buildkite`, `.drone`; `Jenkinsfile`, `.travis.yml`, `.gitlab-ci.yml`, etc. |
| `build`    | `Makefile`, `Dockerfile`, `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `docker-compose.*`, and other build manifests             |
| `chore`    | Extensions `.lock`, `.sum`, `.rc`, `.ini`, `.cfg`; `.gitignore`, `.editorconfig`; `.env*` files                                               |
| `perf`     | Paths under `perf/`, `performance/`, `benchmark/`, `bench/`                                                                                   |
| `refactor` | Paths under `refactor/`                                                                                                                       |
| `feat`     | New/untracked files (git status `A` or `??`)                                                                                                  |
| `fix`      | Everything else                                                                                                                               |

<!-- AUTO-GENERATED -->

**Module** = first path segment of the changed file (`src/utils/foo.ts` → `src`). Root-level files get module `root`.

## Known Gotchas

- **`pnpm-lock.yaml` → `fix`** (not `chore`) — the chore rule checks the `.lock` extension, which misses YAML-format lockfiles.
- **`package.json` → `build`** (not `chore`) — matched by the build rule's explicit filename list.
- **No `console.log` in tool handlers** — the server writes to stdout for MCP transport; logging to stdout corrupts the protocol.

## Architecture

All logic lives in a single file, `index.ts` (~163 lines). No compilation step — `tsx` executes TypeScript directly.

| File               | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `index.ts`         | MCP server + tool implementations + `getGroupedChanges()`  |
| `index.test.ts`    | Vitest suite (292 lines) — mocks `execSync`/`execFileSync` |
| `vitest.config.ts` | Coverage config; v8 provider, reports to `./coverage/`     |
| `package.json`     | pnpm scripts; deps: `@modelcontextprotocol/sdk`, `zod`     |

## License

MIT
