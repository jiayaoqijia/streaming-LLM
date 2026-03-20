---
name: team
description: Launch a team of parallel agents to implement features across the streaming-LLM project. Each agent works on non-overlapping areas (server, client UI, shared types, tests).
---

# Agent Team Skill

## Overview

Launch a coordinated team of background agents to implement features across the streaming-LLM codebase. Each agent works on non-overlapping areas to avoid conflicts.

## Inputs

- Target: area names or "auto" to pick areas needing work
- Focus: "server" (API + MPP), "client" (web UI), "shared" (types/utils), or "all"

## Workflow

1. **Analyze** - Check git status, identify areas needing work
2. **Plan** - Assign non-overlapping areas to agents
3. **Launch** - Start background agents in parallel via Agent tool
4. **Monitor** - Wait for all agents to complete
5. **Verify** - Run build and tests on all affected areas
6. **Commit** - Stage files, commit with descriptive message

## Agent Assignment Rules

- Each agent gets a non-overlapping area (server, client, shared, tests)
- Agents ONLY create NEW files, NEVER modify existing files unless coordinated
- All files must build before the agent reports completion
- Use `subagent_type: "general-purpose"` and `mode: "bypassPermissions"`

## Areas

- `src/` - Server-side Hono routes, MPP integration, LLM proxy
- `web/` - Client-side UI (HTML/CSS/JS)
- `shared/` - Shared types, constants, config
- `tests/` - Test files

## Guardrails

- Never modify files another agent is working on
- Always verify build passes before committing
- Scope commits to the work done
