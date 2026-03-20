# Contributing to streaming-LLM

Thank you for your interest in contributing to streaming-LLM. This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/streaming-LLM.git
   cd streaming-LLM
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a `.dev.vars` file from the example:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
5. Fill in your API keys in `.dev.vars` (see the README for details on each variable)
6. Start the development server:
   ```bash
   pnpm dev
   ```

## How to Contribute

### Reporting Bugs

- Search [existing issues](https://github.com/jiayaoqijia/streaming-LLM/issues) before opening a new one
- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include steps to reproduce, expected behavior, and actual behavior
- Include your environment details (OS, Node.js version, browser)

### Suggesting Features

- Open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe the problem your feature would solve
- Propose your solution and any alternatives you have considered

### Submitting Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes, following the code style guidelines below
3. Run type checking to verify your changes compile:
   ```bash
   pnpm typecheck
   ```
4. Run end-to-end tests if applicable:
   ```bash
   pnpm test:e2e
   ```
5. Commit your changes using conventional commit format (see below)
6. Push your branch and open a pull request against `main`
7. Fill out the pull request template completely

## Code Style

This project enforces strict TypeScript conventions:

- **TypeScript strict mode** -- All code must pass `tsc --noEmit` with strict mode enabled
- **No `any` type** -- Use `unknown` with type narrowing instead
- **ESM modules** -- All imports use ES module syntax
- **Max 500 lines per file** -- Split large files into focused modules
- **Hono patterns** -- Use `c.req`, `c.json()`, `c.text()` for request/response handling
- **Error responses** -- All API errors return `{ error: string, code: string }` with appropriate HTTP status codes

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>: <description>
```

Accepted types:

| Type | Purpose |
|------|---------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, or dependency changes |

Examples:
- `feat: add streaming support for Gemini 2.5 Flash`
- `fix: handle empty response body from OpenRouter`
- `docs: update pricing table in README`
- `refactor: extract SSE parser into shared utility`

## Testing Requirements

Before submitting a pull request:

1. **Type checking must pass:**
   ```bash
   pnpm typecheck
   ```
2. **End-to-end tests must pass** (if you modified API behavior):
   ```bash
   pnpm test:e2e
   ```
3. **Manual testing** -- If you changed the chat flow or payment logic, test the full cycle:
   - Open the web UI at `http://localhost:8787`
   - Send a message and verify tokens stream correctly
   - Verify the cost counter updates in real time
   - If testing MPP payment flow, verify the 402 challenge and channel opening work correctly

## Project Structure

Key areas of the codebase:

- `src/routes/` -- API endpoint handlers (chat, models, health)
- `src/mpp/` -- MPP payment integration (server config, pricing)
- `src/llm/` -- LLM provider integrations (OpenRouter, AltLLM, provider routing)
- `web/` -- Static web UI (HTML, CSS, JS)

When adding a new LLM provider, you will need to:
1. Add a streaming proxy in `src/llm/`
2. Register the provider in `src/llm/provider.ts`
3. Add model entries with pricing in `src/mpp/pricing.ts`
4. Update the types in `src/llm/types.ts` if needed

When modifying payment logic, be especially careful with:
- The MPP session flow in `src/routes/chat.ts`
- The `charge()` calls that must happen per token
- The payment channel configuration in `src/mpp/server.ts`

## Questions

If you have questions about contributing, open a [discussion](https://github.com/jiayaoqijia/streaming-LLM/issues) on the repository.
