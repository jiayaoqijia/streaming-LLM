---
name: code-review
description: Reviews code changes for bugs, security issues, and quality problems
---

# Code Review Skill

Review code changes and identify bugs, security issues, and quality problems.

## Workflow

1. **Get the code changes** - `gh pr diff <PR_NUMBER>` or `git diff main`
2. **Read full files and related code** before commenting
3. **Analyze for issues** - Focus on what could break production
4. **Report findings** - Summarize directly

## Severity Levels

- **CRITICAL**: Security vulnerabilities, auth bypass, data corruption, crashes
- **IMPORTANT**: Logic bugs, race conditions, resource leaks, unhandled errors
- **NITPICK**: Minor improvements, style issues

## What to Look For

- **Security**: Auth bypass, injection, data exposure, improper access control
- **Correctness**: Logic errors, off-by-one, nil/null handling, error paths
- **Concurrency**: Race conditions, deadlocks, missing synchronization
- **Resources**: Leaks, unclosed handles, missing cleanup
- **Error handling**: Swallowed errors, missing validation

## What NOT to Comment On

- Style that matches existing project patterns
- Code that already exists unchanged
- Theoretical issues without concrete impact
