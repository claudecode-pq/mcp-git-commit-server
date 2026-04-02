#!/bin/bash

set -e

# This script sets up the Claude plugins for the current project. It adds the following plugins:
# - claude-code-setup: A plugin that provides code setup and configuration.
# - claude-md-management: A plugin that provides markdown management capabilities.
# - code-simplifier: A plugin that simplifies code by applying various transformations.
# - feature-dev: A plugin that provides features for development.
# - skill-creator: A plugin that helps create skills for Claude.
# - superpowers: A plugin that provides various superpowers for Claude.
# - typescript-lsp: A plugin that provides TypeScript language server capabilities for Claude.
claude plugin marketplace add anthropics/skills || true
claude plugin marketplace update anthropic-agent-skills || true
claude plugin marketplace add anthropics/claude-plugins-official || true
claude plugin marketplace update claude-plugins-official || true
claude plugin marketplace add affaan-m/everything-claude-code || true
claude plugin marketplace update everything-claude-code || true
claude plugin marketplace list
claude plugin i -s local claude-code-setup@claude-plugins-official || true
claude plugin update -s local claude-code-setup@claude-plugins-official || true
claude plugin i -s local claude-md-management@claude-plugins-official || true
claude plugin update -s local claude-md-management@claude-plugins-official || true
claude plugin i -s local code-simplifier@claude-plugins-official || true
claude plugin update -s local code-simplifier@claude-plugins-official || true
claude plugin i -s local feature-dev@claude-plugins-official || true
claude plugin update -s local feature-dev@claude-plugins-official || true
claude plugin i -s local skill-creator@claude-plugins-official || true
claude plugin update -s local skill-creator@claude-plugins-official || true
claude plugin i -s local superpowers@claude-plugins-official || true
claude plugin update -s local superpowers@claude-plugins-official || true
claude plugin i -s local typescript-lsp@claude-plugins-official || true
claude plugin update -s local typescript-lsp@claude-plugins-official || true
claude plugin i -s local everything-claude-code@everything-claude-code || true
claude plugin update -s local everything-claude-code@everything-claude-code || true
claude plugin list

# Install the TypeScript language server globally to provide TypeScript support in the plugins.
npm install -g typescript-language-server typescript
