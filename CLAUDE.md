# streaming-LLM

MPP-powered streaming LLM chat API. Charges per token via payment channel sessions — no per-request payment overhead.

## Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Payments:** mppx (MPP — Machine Payments Protocol)
- **LLM Backend:** OpenRouter (multi-model)
- **Web UI:** Static HTML/CSS/JS (dark cyberpunk theme, JetBrains Mono)

## Repository Structure

```
src/
  index.ts          — Worker entry point, Hono app
  routes/
    chat.ts         — POST /api/chat (MPP session-gated, SSE streaming)
    models.ts       — GET /api/models (free, list available models)
    health.ts       — GET /api/health
  mpp/
    server.ts       — Mppx server config (tempo payment method)
    pricing.ts      — Per-token pricing by model
  llm/
    openrouter.ts   — OpenRouter streaming proxy
    types.ts        — LLM request/response types
  types.ts          — Shared types
web/
  index.html        — Chat UI with real-time cost counter
  styles.css        — Dark cyberpunk theme (eth2030 style)
  app.js            — Client-side logic, MPP client, SSE consumption
wrangler.toml       — Cloudflare Workers config
package.json
tsconfig.json
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Local dev server (wrangler dev)
pnpm deploy           # Deploy to Cloudflare Workers
pnpm typecheck        # Type checking
```

## Environment Variables

Set in `.dev.vars` (local) or Cloudflare dashboard (production):

- `OPENROUTER_API_KEY` — OpenRouter API key
- `TEMPO_PRIVATE_KEY` — Server wallet private key for MPP

## Coding Style

- TypeScript, strict mode, ESM
- No `any` — use `unknown` with type narrowing
- Max 500 LOC per file
- Hono patterns: `c.req`, `c.json()`, `c.text()`
- Error responses: `{ error: string, code: string }`

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- No co-author lines
