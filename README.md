<div align="center">

# streaming-LLM

**Pay-per-token streaming LLM chat API powered by Machine Payments Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020.svg)](https://workers.cloudflare.com/)

</div>

---

streaming-LLM is an API service that streams LLM completions over Server-Sent Events and charges per output token using MPP (Machine Payments Protocol) payment channels on the Tempo blockchain. Unlike traditional API billing that requires accounts, invoices, and monthly settlements, MPP enables real-time micropayments: clients open a payment channel, and the server charges fractional amounts for each token as it streams. This eliminates per-request payment overhead and makes LLM access fully permissionless.

[Live Demo](https://streaming-llm.jiayaoqijia.workers.dev) | [API Reference](#api-reference) | [Contributing](CONTRIBUTING.md)

---

## Features

- **Per-token streaming payments** -- MPP payment channels charge for each output token in real time, with no upfront deposits or minimum balances
- **Dual LLM providers** -- Routes requests to OpenRouter (Llama 4 Maverick, Claude Sonnet 4, Gemini 2.5 Pro, DeepSeek R1) or AltLLM (Standard, Basic, Mega)
- **Server-Sent Events streaming** -- Responses stream token-by-token with live cost tracking in each SSE chunk
- **Cyberpunk web UI** -- Dark-themed chat interface built with vanilla HTML/CSS/JS, JetBrains Mono typography, and a real-time cost counter
- **Cloudflare Workers runtime** -- Edge-deployed globally with KV-backed session persistence
- **Hono framework** -- Lightweight, typed HTTP routing with CORS and structured error responses
- **Demo mode** -- Optional `DEMO_MODE=true` flag bypasses payment for development and testing
- **7 models across 2 providers** -- Flexible model selection with transparent per-token pricing

## Architecture

```
                         +------------------+
                         |   Web UI (SSE)   |
                         |  cyberpunk theme |
                         +--------+---------+
                                  |
                                  v
+------------------+    +------------------+    +------------------+
|  MPP Client      |--->|  Cloudflare      |--->|  OpenRouter API  |
|  (payment chan.) |    |  Worker (Hono)   |    |  (multi-model)   |
+------------------+    |                  |    +------------------+
                        |  /api/health     |
                        |  /api/models     |    +------------------+
                        |  /api/chat (SSE) |--->|  AltLLM API      |
                        |                  |    +------------------+
                        +--------+---------+
                                 |
                        +--------+---------+
                        |  Cloudflare KV   |
                        |  (MPP sessions)  |
                        +------------------+
                                 |
                        +--------+---------+
                        |  Tempo Blockchain |
                        |  (settlements)   |
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

# Start the local dev server
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

The chat endpoint is gated by MPP payment channels. The flow works as follows:

1. **Client sends a chat request** without payment credentials
2. **Server responds with HTTP 402** containing an MPP challenge (payment channel parameters, per-token price, wallet address)
3. **Client opens a payment channel** on Tempo blockchain using the challenge parameters
4. **Client retries the request** with MPP authorization headers
5. **Server streams tokens via SSE**, calling `paymentStream.charge()` for each output token
6. **Each SSE chunk** includes `{ token: "...", cost: 0.000045 }` with the running total

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "model": "anthropic/claude-sonnet-4"
}
```

**SSE response stream:**

```
data: {"token":"Hello","cost":0.000015}
data: {"token":"!","cost":0.00003}
data: {"token":" I'm","cost":0.000045}
data: [DONE]
```

## Models and Pricing

| Model | Provider | Input (per token) | Output (per token) |
|-------|----------|-------------------|---------------------|
| Llama 4 Maverick | OpenRouter | $0.0000002 | $0.0000008 |
| Claude Sonnet 4 | OpenRouter | $0.000003 | $0.000015 |
| Gemini 2.5 Pro | OpenRouter | $0.0000025 | $0.000015 |
| DeepSeek R1 | OpenRouter | $0.0000005 | $0.000002 |
| AltLLM Standard | AltLLM | $0.0000006 | $0.0000024 |
| AltLLM Basic | AltLLM | $0.0000035 | $0.000028 |
| AltLLM Mega | AltLLM | $0.00003 | $0.00015 |

Prices are denominated in the Tempo network currency. The MPP payment channel charges the output price per token as each token streams.

## Environment Variables

Set these in `.dev.vars` for local development or in the Cloudflare dashboard for production:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | API key from [OpenRouter](https://openrouter.ai/) |
| `ALTLLM_API_KEY` | Yes | API key for AltLLM provider |
| `TEMPO_PRIVATE_KEY` | Yes | Hex-encoded private key for the server's Tempo wallet (used to sign payment channel operations) |
| `DEMO_MODE` | No | Set to `"true"` to bypass MPP payment gating (for development/testing only) |

The `MPP_STORE` KV namespace is configured in `wrangler.toml` and used to persist payment channel session state.

## Web UI

The bundled web interface is served as static assets from the `web/` directory. It features a dark cyberpunk aesthetic with neon accent colors, JetBrains Mono monospace typography, and a real-time token cost counter that updates as each SSE chunk arrives. The UI handles the full MPP payment flow client-side: it receives the 402 challenge, opens a payment channel, and then consumes the authenticated SSE stream. Model selection is populated dynamically from the `/api/models` endpoint.

## MPP Payment Flow

MPP (Machine Payments Protocol) enables machine-to-machine micropayments over payment channels. Here is how it works in streaming-LLM:

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

The server uses the `mppx` library with Tempo as the payment method. Payment channel state is persisted in Cloudflare KV (`MPP_STORE`). The server wallet signs operations using the configured `TEMPO_PRIVATE_KEY`. The currency address `0x20c0...` identifies the payment token on the Tempo network.

Key properties:
- **No per-request overhead** -- The payment channel is opened once and reused across the entire streaming session
- **Real-time charging** -- Each output token triggers a `charge()` call that increments the channel balance
- **Permissionless** -- No accounts, API keys, or signup required; only a funded Tempo wallet
- **SSE cost tracking** -- Every SSE chunk includes the cumulative cost so the client can display spend in real time

## Testing

```bash
# Type checking
pnpm typecheck

# End-to-end tests (Playwright)
pnpm test:e2e
```

## Deployment

streaming-LLM deploys to Cloudflare Workers:

```bash
# Deploy to production
pnpm deploy
```

Before deploying, set the production environment variables in the Cloudflare dashboard under Workers > streaming-llm > Settings > Variables. The KV namespace `MPP_STORE` must be created and bound as configured in `wrangler.toml`.

The worker serves both the API routes (`/api/*`) and the static web UI. Requests matching `/api/*` are handled by the worker first; all other requests serve static assets from the `web/` directory.

## License

This project is licensed under the [MIT License](LICENSE).

---

## Development Notes

The following notes are intended for AI coding assistants and contributors working on the codebase.

### Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Payments:** mppx (MPP -- Machine Payments Protocol)
- **LLM Backend:** OpenRouter (multi-model), AltLLM
- **Web UI:** Static HTML/CSS/JS (dark cyberpunk theme, JetBrains Mono)

### Repository Structure

```
src/
  index.ts          -- Worker entry point, Hono app
  routes/
    chat.ts         -- POST /api/chat (MPP session-gated, SSE streaming)
    models.ts       -- GET /api/models (free, list available models)
    health.ts       -- GET /api/health
  mpp/
    server.ts       -- Mppx server config (tempo payment method)
    pricing.ts      -- Per-token pricing by model
  llm/
    openrouter.ts   -- OpenRouter streaming proxy
    altllm.ts       -- AltLLM streaming proxy
    provider.ts     -- Provider routing logic
    types.ts        -- LLM request/response types
  types.ts          -- Shared types
web/
  index.html        -- Chat UI with real-time cost counter
  styles.css        -- Dark cyberpunk theme (eth2030 style)
  app.js            -- Client-side logic, MPP client, SSE consumption
wrangler.toml       -- Cloudflare Workers config
package.json
tsconfig.json
```

### Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Local dev server (wrangler dev)
pnpm deploy           # Deploy to Cloudflare Workers
pnpm typecheck        # Type checking
pnpm test:e2e         # End-to-end tests (Playwright)
```

### Coding Style

- TypeScript, strict mode, ESM
- No `any` -- use `unknown` with type narrowing
- Max 500 LOC per file
- Hono patterns: `c.req`, `c.json()`, `c.text()`
- Error responses: `{ error: string, code: string }`

### Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
