---
name: scan
description: Run a security scan on the codebase using available scanners. Returns structured findings with severity and OWASP mapping.
---

# Security Scan Skill

## Overview

Run a multi-engine security scan on a target directory and produce a structured vulnerability report.

## Engines

1. **Semgrep** - SAST rules for JS/TS
2. **Trivy** - Dependency + container scanning

## Workflow

1. Detect project languages and package managers
2. Run applicable scanners
3. Classify by severity: CRITICAL, HIGH, MEDIUM, LOW
4. Map findings to OWASP Top 10
5. Output structured report

## Guardrails

- Read-only: do not modify any scanned files
- Filter out low-confidence results by default
