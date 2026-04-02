#!/bin/bash

set -e

# This script sets up the Claude MCP servers for the current project. It adds the following servers:
# - everything: A server that provides access to all context sources.
# - fetch: A server that allows fetching data from the web.
# - filesystem: A server that provides access to the local filesystem.
# - git: A server that provides access to the git repository of the current project.
# - lean-ctx: A server that provides access to the Lean Context.
# - sequential-thinking: A server that provides access to the Sequential Thinking context.
# - git-commit-server: A server that provides access to the git commit history of the current project.
claude mcp add --transport stdio everything -- npx -y @modelcontextprotocol/server-everything || true
claude mcp add --transport stdio fetch -- uvx mcp-server-fetch || true
claude mcp add --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem $(pwd) || true
claude mcp add --transport stdio git -- uvx mcp-server-git --repository $(pwd) || true
claude mcp add --transport stdio lean-ctx -- lean-ctx || true
claude mcp add --transport stdio sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking || true
claude mcp add --transport stdio git-commit-server -- node "$(pwd)/build/index.js" || true
claude mcp list
