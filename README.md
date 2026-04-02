# mcp-git-commit-server

MCP server that analyzes staged git changes and executes conventional commits. Communicates via stdio transport; no compilation required.

## Configuration

All examples use `npx` to run the server directly from npm — no local clone needed.

### Claude Desktop

Edit your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "git-commit": {
      "command": "npx",
      "args": ["-y", "@claudecode-pq/mcp-git-commit-server"]
    }
  }
}
```

### Claude Code

**Via CLI (recommended):**

```bash
# Project-scoped
claude mcp add git-commit npx -- -y @claudecode-pq/mcp-git-commit-server

# Global
claude mcp add --scope user git-commit npx -- -y @claudecode-pq/mcp-git-commit-server
```

**Via settings file** — project (`.claude/settings.json`) or global (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "git-commit": {
      "command": "npx",
      "args": ["-y", "@claudecode-pq/mcp-git-commit-server"],
      "type": "stdio"
    }
  }
}
```

### VSCode

Create `.vscode/mcp.json` in your workspace root:

```json
{
  "servers": {
    "git-commit": {
      "command": "npx",
      "args": ["-y", "@claudecode-pq/mcp-git-commit-server"],
      "type": "stdio"
    }
  }
}
```

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
