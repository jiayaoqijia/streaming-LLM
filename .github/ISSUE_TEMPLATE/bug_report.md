---
name: Bug Report
about: Report a bug to help improve streaming-LLM
title: "[Bug] "
labels: bug
assignees: ""
---

## Description

A clear and concise description of the bug.

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened. Include any error messages, HTTP status codes, or console output.

## Environment

- **OS:** (e.g., macOS 15, Ubuntu 24.04, Windows 11)
- **Browser:** (e.g., Chrome 130, Firefox 135, Safari 18)
- **Node.js version:** (e.g., 22.x)
- **pnpm version:** (e.g., 9.x)
- **Deployment:** (local dev / Cloudflare Workers production)

## Model and Provider

- **Model used:** (e.g., `anthropic/claude-sonnet-4`, `altllm-standard`)
- **Provider:** (OpenRouter / AltLLM)

## Payment Context

- **Demo mode enabled:** (yes / no)
- **Payment channel opened successfully:** (yes / no / not applicable)
- **402 challenge received:** (yes / no / not applicable)

## Request and Response

If applicable, include the request body and any relevant response data (redact any private keys or tokens):

```json
{
  "messages": [...],
  "model": "..."
}
```

## Additional Context

Add any other context, screenshots, or logs that might help diagnose the issue.
