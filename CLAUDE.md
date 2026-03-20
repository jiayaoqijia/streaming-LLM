# streaming-LLM

MPP-powered streaming LLM chat API. Charges per token via payment channel sessions on Tempo mainnet.

## Stack

- **Runtime:** Node.js (Railway) / Cloudflare Workers
- **Framework:** Hono
- **Payments:** mppx (MPP -- Machine Payments Protocol)
- **LLM Backend:** OpenRouter (multi-model), AltLLM
- **Blockchain:** Tempo mainnet (pathUSD)
- **Web UI:** Static HTML/CSS/JS (dark cyberpunk theme, JetBrains Mono)

## Repository Structure

```
src/
  index.ts          -- Worker entry point (Cloudflare Workers)
  node.ts           -- Node.js entry point (Railway, Docker)
  routes/
    chat.ts         -- POST /api/chat (MPP session-gated, SSE streaming)
    models.ts       -- GET /api/models (free, list available models)
    health.ts       -- GET /api/health
  mpp/
    server.ts       -- Mppx server config (Tempo, pathUSD, feePayer)
    pricing.ts      -- Per-token pricing by model (14 models)
  llm/
    openrouter.ts   -- OpenRouter streaming proxy
    altllm.ts       -- AltLLM streaming proxy
    provider.ts     -- Provider routing logic
    types.ts        -- LLM request/response types
  types.ts          -- Shared types (Env bindings)
web/
  index.html        -- Chat UI with wallet connect and settings panel
  styles.css        -- Cyberpunk theme (eth2030 style)
  app.js            -- Client-side logic, SSE consumption, wallet
  terms.html        -- Terms of Service
  privacy.html      -- Privacy Policy
tests/
  e2e/              -- Playwright E2E tests (demo + mainnet MPP)
  playwright.config.ts
Dockerfile          -- Multi-stage Docker build for Railway
wrangler.toml       -- Cloudflare Workers config
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Local dev (Cloudflare Workers)
pnpm dev:node         # Local dev (Node.js)
pnpm build            # Build for Node.js production
pnpm start            # Start Node.js production server
pnpm deploy           # Deploy to Cloudflare Workers
pnpm typecheck        # Type checking
pnpm test:e2e         # Playwright E2E tests
```

## Environment Variables

Set in `.dev.vars` (local) or deployment platform (Railway, Cloudflare):

- `OPENROUTER_API_KEY` -- OpenRouter API key
- `ALTLLM_API_KEY` -- AltLLM API key
- `TEMPO_PRIVATE_KEY` -- Server wallet private key for MPP (Tempo mainnet)
- `DEMO_MODE` -- Set to `"true"` to bypass MPP payment gating

## Coding Style

- TypeScript, strict mode, ESM
- No `any` -- use `unknown` with type narrowing
- Max 500 LOC per file
- Hono patterns: `c.req`, `c.json()`, `c.text()`
- Error responses: `{ error: string, code: string }`

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- No co-author lines

## Deployment

- **Production (Railway):** `pnpm build && pnpm start` via Dockerfile
- **Alternative (Cloudflare Workers):** `pnpm deploy` with KV namespace for MPP store
- **Live URL:** https://api-production-5bcc.up.railway.app
