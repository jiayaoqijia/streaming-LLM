# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in streaming-LLM, please report it responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

Send an email to the maintainers with the following information:

- **Email:** security@jiayaoqijia.dev
- **Subject line:** `[streaming-LLM] Security Vulnerability Report`

Include in your report:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. The potential impact (data exposure, unauthorized access, fund loss, etc.)
4. Any suggested mitigations or fixes, if you have them

### What to Expect

- **Acknowledgment** -- We will acknowledge receipt of your report within 48 hours
- **Assessment** -- We will assess the severity and impact within 5 business days
- **Resolution** -- We will work on a fix and coordinate disclosure with you
- **Credit** -- We will credit you in the release notes unless you prefer to remain anonymous

## Scope

The following areas are in scope for security reports:

### API and Server

- Authentication bypass or MPP session manipulation
- Server-Side Request Forgery (SSRF) through LLM provider proxying
- Injection attacks via chat message content
- Denial of service through malformed requests
- Information disclosure through error messages or headers

### Payment Channels (MPP)

- Payment channel manipulation or balance tampering
- Unauthorized charges or charge bypass
- Session hijacking or replay attacks
- Private key exposure or wallet compromise
- Incorrect pricing or charge calculation

### Wallet and Key Management

- Exposure of `TEMPO_PRIVATE_KEY` or other secrets
- Insecure key storage or transmission
- Cloudflare KV data exposure

### Web UI

- Cross-site scripting (XSS) through streamed LLM responses
- Cross-site request forgery (CSRF) on API endpoints
- Sensitive data exposure in client-side code

## Out of Scope

- Vulnerabilities in upstream dependencies (report these to the respective projects)
- Vulnerabilities in Cloudflare Workers platform itself
- Vulnerabilities in the Tempo blockchain or MPP protocol specification
- Social engineering attacks
- Rate limiting or brute force (the API relies on MPP payment gating for access control)

## Security Best Practices for Operators

If you are deploying streaming-LLM:

- Never commit `.dev.vars` or any file containing private keys to version control
- Use unique, high-entropy values for `TEMPO_PRIVATE_KEY`
- Set environment variables through the Cloudflare dashboard for production, not through code
- Monitor payment channel activity for anomalous charge patterns
- Keep dependencies updated with `pnpm update`
