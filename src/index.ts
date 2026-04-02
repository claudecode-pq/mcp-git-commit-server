#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync, execFileSync } from 'node:child_process';

// Initialize the MCP server with a name and version. This server will handle incoming requests and execute the registered tools.
const server = new McpServer({
  name: 'GitCommitServer',
  version: '1.0.0'
});

/**
 * Helper function to get grouped changes from git status
 */
export function getGroupedChanges() {
  try {
    const output = execSync('git status --porcelain', {
      encoding: 'utf8'
    }).trim();
    if (!output) return { message: 'No uncommitted changes found.' };
    const groups: Record<string, string[]> = {};
    output.split('\n').forEach((line: string) => {
      const status = line.slice(0, 2).trim();
      const path = line.slice(3).trim();
      const parts = path.split('/');
      const module = parts.length > 1 ? parts[0] : 'root';
      const filename = parts[parts.length - 1] ?? '';
      let type: string;
      if (
        path.includes('test') ||
        path.includes('spec') ||
        path.includes('__tests__') ||
        path.includes('tests/') ||
        /\.(test|spec)\.[^.]+$/.test(filename)
      ) {
        type = 'test';
      } else if (
        /\.(md|mdx|txt|rst|adoc|asciidoc)$/i.test(filename) ||
        /^(README|CHANGELOG|LICENSE|CONTRIBUTING|WIKI)/i.test(filename) ||
        path.startsWith('docs/')
      ) {
        type = 'docs';
      } else if (
        /\.(css|scss|sass|less|styl)$/.test(filename) ||
        path.includes('.styled.')
      ) {
        type = 'style';
      } else if (
        path.includes('.github/workflows') ||
        path.includes('.github/actions') ||
        path.includes('.circleci') ||
        path.includes('.buildkite') ||
        path.includes('.drone') ||
        /^(Jenkinsfile|\.travis\.yml|\.gitlab-ci\.yml|azure-pipelines\.yml|bitbucket-pipelines\.yml)$/.test(
          filename
        )
      ) {
        type = 'ci';
      } else if (
        /^(Makefile|CMakeLists\.txt|Dockerfile|.*\.gradle|pom\.xml|Cargo\.toml|go\.mod|setup\.py|pyproject\.toml|requirements.*\.txt|package\.json|.*\.csproj|.*\.sln|Gemfile|composer\.json|build\.xml|meson\.build|SConstruct|Rakefile|.*\.cabal|stack\.yaml)$/i.test(
          filename
        ) ||
        /^docker-compose/i.test(filename)
      ) {
        type = 'build';
      } else if (
        /\.(lock|sum|rc|ini|cfg)$/.test(filename) ||
        /^(\.gitignore|\.gitattributes|\.gitmodules|\.editorconfig)$/.test(
          filename
        ) ||
        /^\.env/.test(filename)
      ) {
        type = 'chore';
      } else if (
        path.includes('perf/') ||
        path.includes('performance/') ||
        path.includes('benchmark/') ||
        path.includes('bench/')
      ) {
        type = 'perf';
      } else if (path.includes('refactor/')) {
        type = 'refactor';
      } else if (status === 'A' || status === '??') {
        type = 'feat';
      } else {
        type = 'fix';
      }
      const key = `${type}(${module})`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(path);
    });

    return groups;
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * Handler for the get_staged_analysis tool
 */
export async function getStagedAnalysisHandler() {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(getGroupedChanges(), null, 2)
      }
    ]
  };
}

/**
 * Handler for the execute_commit tool
 */
export function executeCommit(commitMessage: string) {
  try {
    execFileSync('git', ['add', '.']);
    const stdout = execFileSync('git', ['commit', '-m', commitMessage], {
      encoding: 'utf8'
    });
    return { content: [{ type: 'text' as const, text: `Success: ${stdout}` }] };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

/**
 * 1. Register: get_staged_analysis
 * This tool analyzes the current git status and returns a token-dense summary of changes grouped by type and module.
 */
server.registerTool(
  'get_staged_analysis',
  {
    title: 'Analyze Staged Changes',
    description:
      'Returns a token-dense summary of git changes grouped by type and module',
    inputSchema: z.object({})
  },
  getStagedAnalysisHandler
);

/**
 * 2. Register: execute_commit
 * This tool stages all files and executes a formatted git commit using the provided commit message. The commit message should follow the format: <type>(<module>): <description>.
 */
server.registerTool(
  'execute_commit',
  {
    title: 'Execute Commit',
    description: 'Stages all files and executes a formatted git commit',
    inputSchema: z.object({
      commit_message: z
        .string()
        .describe('The formatted message: <type>(<module>): <description>')
    })
  },
  /* v8 ignore next */
  async ({ commit_message }) => executeCommit(commit_message)
);

/**
 * Start the server and connect it to the standard I/O transport. This allows the server to communicate with clients through the console.
 */
/* v8 ignore next 4 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the main function and catch any unhandled errors
/* v8 ignore next 3 */
if (process.env['VITEST'] !== 'true') {
  // eslint-disable-next-line no-console
  main().catch(console.error);
}
