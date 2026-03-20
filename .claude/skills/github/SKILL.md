---
name: github
description: "GitHub operations via gh CLI: issues, PRs, CI runs, code review, API queries."
---

# GitHub Skill

Use the `gh` CLI to interact with GitHub repositories, issues, PRs, and CI.

## Common Commands

### Pull Requests
```bash
gh pr list --repo owner/repo
gh pr checks 55 --repo owner/repo
gh pr view 55 --repo owner/repo
gh pr create --title "feat: add feature" --body "Description"
gh pr merge 55 --squash --repo owner/repo
```

### Issues
```bash
gh issue list --repo owner/repo --state open
gh issue create --title "Bug: something broken" --body "Details..."
gh issue close 42 --repo owner/repo
```

### CI/Workflow Runs
```bash
gh run list --repo owner/repo --limit 10
gh run view <run-id> --repo owner/repo
gh run view <run-id> --repo owner/repo --log-failed
```
