<div align="center">

# streaming-LLM

**Pay-per-token streaming LLM chat API powered by Machine Payments Protocol**

[![License: AGPL--3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![Railway](https://img.shields.io/badge/Railway-deployed-0B0D0E.svg)](https://railway.com)

</div>

---

streaming-LLM is an API service that streams LLM completions over Server-Sent Events and charges per output token using MPP (Machine Payments Protocol) payment channels on the Tempo blockchain. Unlike traditional API billing that requires accounts, invoices, and monthly settlements, MPP enables real-time micropayments: clients open a payment channel, and the server charges fractional amounts for each token as it streams. This eliminates per-request payment overhead and makes LLM access fully permissionless.

[Live Demo](https://streamingllm.ottie.xyz) | [API Reference](#api-reference) | [Contributing](CONTRIBUTING.md)

---

## Features

- **Per-token streaming payments** -- MPP payment channels charge for each output token in real time
- **14 models across 2 providers** -- OpenRouter (Claude Opus 4.6, GPT-5.4, Gemini 2.5 Pro, GLM-5, MiniMax M2.7, and more) and AltLLM
- **Server-Sent Events streaming** -- Responses stream token-by-token with live cost tracking in each SSE chunk
- **Cyberpunk web UI** -- Dark-themed chat interface with JetBrains Mono typography, wallet connection, settings panel, and real-time cost counter
- **Dual runtime** -- Runs on both Cloudflare Workers (edge) and Node.js (Railway, Docker)
- **Hono framework** -- Lightweight, typed HTTP routing with CORS and structured error responses
- **Demo mode** -- `DEMO_MODE=true` bypasses payment for development and testing
- **Wallet connect** -- MetaMask integration for MPP payment flow
- **Settings panel** -- User-configurable API keys for OpenRouter and AltLLM

## Architecture

```
                         +------------------+
                         |   Web UI (SSE)   |
                         |  wallet connect  |
                         +--------+---------+
                                  |
                                  v
+------------------+    +------------------+    +------------------+
|  MPP Client      |--->|  Hono Server     |--->|  OpenRouter API  |
|  (payment chan.) |    |  (Node.js /      |    |  (11 models)     |
+------------------+    |   CF Workers)    |    +------------------+
                        |                  |
                        |  /api/health     |    +------------------+
                        |  /api/models     |--->|  AltLLM API      |
                        |  /api/chat (SSE) |    |  (3 models)      |
                        +--------+---------+    +------------------+
                                 |
                        +--------+---------+
                        |  Tempo Blockchain |
                        |  (pathUSD settle) |
                        +------------------+
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jiayaoqijia/streaming-LLM.git
cd streaming-LLM

# Install dependencies
pnpm install

# Configure environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys (see Environment Variables below)

# Start the local dev server (Node.js)
pnpm dev:node

# Or start with Cloudflare Workers
pnpm dev
```

The development server runs at `http://localhost:8787`. Open it in a browser to access the chat UI, or call the API directly.

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | None | Returns `{ status: "ok", timestamp: "..." }` |
| `GET` | `/api/models` | None | Lists all available models grouped by provider |
| `POST` | `/api/chat` | MPP | Streams LLM completion tokens via SSE |

### POST /api/chat

The chat endpoint is gated by MPP payment channels (when `DEMO_MODE=false`). The flow:

1. **Client sends a chat request** without payment credentials
2. **Server responds with HTTP 402** containing an MPP challenge
3. **Client opens a payment channel** on Tempo blockchain
4. **Client retries the request** with MPP authorization headers
5. **Server streams tokens via SSE**, charging per output token
6. **Each SSE chunk** includes `{ token: "...", cost: 0.000045 }` with the running total

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "model": "anthropic/claude-opus-4.6"
}
```

**SSE response stream:**

```
data: {"token":"Hello","cost":0.000025}
data: {"token":"!","cost":0.00005}
data: {"token":" How","cost":0.000075}
data: [DONE]
```

## Models and Pricing

### OpenRouter

| Model | ID | Input/M | Output/M |
|-------|-----|---------|----------|
| Claude Opus 4.6 | `anthropic/claude-opus-4.6` | $5.00 | $25.00 |
| GPT-5.4 | `openai/gpt-5.4` | $2.50 | $15.00 |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | $1.25 | $10.00 |
| GLM-5 | `z-ai/glm-5` | $0.72 | $2.30 |
| Claude Sonnet 4 | `anthropic/claude-sonnet-4` | $3.00 | $15.00 |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | $1.00 | $5.00 |
| GPT-5.4 Mini | `openai/gpt-5.4-mini` | $0.75 | $4.50 |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | $0.30 | $2.50 |
| MiniMax M2.7 | `minimax/minimax-m2.7` | $0.30 | $1.20 |
| Llama 4 Maverick | `meta-llama/llama-4-maverick` | $0.15 | $0.60 |
| DeepSeek R1 | `deepseek/deepseek-r1` | $0.70 | $2.50 |

### AltLLM

| Model | ID | Input/M | Output/M |
|-------|-----|---------|----------|
| AltLLM Standard | `altllm-standard` | $0.60 | $2.40 |
| AltLLM Basic | `altllm-basic` | $3.50 | $28.00 |
| AltLLM Mega | `altllm-mega` | $30.00 | $150.00 |

Prices are in USD per million tokens. The MPP payment channel charges the output price per token as each token streams. Payment is in pathUSD on Tempo mainnet.

## Environment Variables

Set these in `.dev.vars` (local) or your deployment platform:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | API key from [OpenRouter](https://openrouter.ai/keys) |
| `ALTLLM_API_KEY` | Yes | API key from [AltLLM](https://altllm.ai) |
| `TEMPO_PRIVATE_KEY` | Yes | Hex-encoded private key for the server's Tempo wallet |
| `DEMO_MODE` | No | Set to `"true"` to bypass MPP payment (for dev/testing) |

## Web UI

The bundled web interface (`web/`) features:

- Dark cyberpunk aesthetic with neon purple/teal accents
- JetBrains Mono typography with CRT scanline overlay
- Real-time cost counter updating per SSE chunk
- Provider switcher (OpenRouter / AltLLM) with model dropdown
- Wallet connect button (MetaMask) for MPP payments
- Settings panel with API key management
- Links to sign up for OpenRouter and AltLLM
- pathUSD onboarding info for Tempo blockchain
- Terms of Service and Privacy Policy pages

## MPP Payment Flow

```
Client                          Server                      Tempo Blockchain
  |                               |                               |
  |-- POST /api/chat ------------>|                               |
  |<-- 402 + MPP Challenge -------|                               |
  |                               |                               |
  |-- Open payment channel ------>|------------------------------>|
  |<-- Channel confirmed ---------|<------------------------------|
  |                               |                               |
  |-- POST /api/chat + Auth ----->|                               |
  |<-- SSE: token + charge -------|  (charge() per token)         |
  |<-- SSE: token + charge -------|                               |
  |<-- SSE: [DONE] ---------------|                               |
  |                               |                               |
  |         (channel settles on close)                            |
  |                               |------------------------------>|
```

The server uses the `mppx` library with Tempo as the payment method. Payment channel state is persisted in memory (Node.js) or Cloudflare KV (Workers). The currency is pathUSD (`0x20c0...`) on Tempo mainnet.

## Testing

```bash
# Type checking
pnpm typecheck

# End-to-end tests (Playwright, demo mode)
pnpm test:e2e

# Mainnet MPP tests (requires funded wallets)
npx playwright test --config tests/playwright.config.ts tests/e2e/mpp-mainnet.spec.ts
```

## Deployment

### Railway (recommended)

The project includes a `Dockerfile` and `src/node.ts` entry point for Node.js deployment:

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

Set environment variables in the Railway dashboard. The server listens on `$PORT` (auto-assigned by Railway).

### Cloudflare Workers

```bash
pnpm deploy
```

Requires a `MPP_STORE` KV namespace bound in `wrangler.toml`. Set secrets via `wrangler secret put`.

## License

This project is licensed under the [AGPL-3.0 License](LICENSE).

---

## Development Notes

The following notes are intended for AI coding assistants and contributors.

### Repository Structure

```
src/
  index.ts          -- Worker entry point (Cloudflare Workers)
  node.ts           -- Node.js entry point (Railway, Docker)
  routes/
    chat.ts         -- POST /api/chat (MPP session-gated, SSE streaming)
    models.ts       -- GET /api/models
    health.ts       -- GET /api/health
  mpp/
    server.ts       -- Mppx server config (Tempo, pathUSD, feePayer)
    pricing.ts      -- Per-token pricing by model
  llm/
    openrouter.ts   -- OpenRouter streaming proxy
    altllm.ts       -- AltLLM streaming proxy
    provider.ts     -- Provider routing logic
    types.ts        -- LLM request/response types
  types.ts          -- Shared types (Env bindings)
web/
  index.html        -- Chat UI with wallet connect and settings
  styles.css        -- Cyberpunk theme
  app.js            -- Client-side logic, SSE consumption
  terms.html        -- Terms of Service
  privacy.html      -- Privacy Policy
tests/
  e2e/              -- Playwright E2E tests
  playwright.config.ts
Dockerfile          -- Multi-stage Docker build
wrangler.toml       -- Cloudflare Workers config
```

### Commands

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

### Coding Style

- TypeScript, strict mode, ESM
- No `any` -- use `unknown` with type narrowing
- Max 500 LOC per file
- Hono patterns: `c.req`, `c.json()`, `c.text()`
- Error responses: `{ error: string, code: string }`

### Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- No co-author lines
