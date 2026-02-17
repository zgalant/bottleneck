---
name: yeet
description: "Creates pull requests on GitHub using the gh CLI from a feature branch to master. Includes automatic PR description generation based on commit history and diffs. Use for quickly shipping features to the main branch."
---

# Yeet Skill

Rapidly create pull requests on GitHub using the `gh` CLI with automatic description generation from commits.

## Quick Start

```bash
# Create a PR from current branch to master (always targets codehs/bottleneck)
gh pr create --base master --head $(git branch --show-current) \
  --repo codehs/bottleneck \
  --title "Your title" \
  --body "Your description"
```

## Full Workflow

### 1. Get Current Branch Info
```bash
git branch --show-current
```

### 2. View Commits & Changes
```bash
# See commits on current branch
git log master..HEAD --oneline

# View file statistics
git diff master..HEAD --stat

# See full diff if needed
git diff master..HEAD
```

### 3. Create PR with gh CLI (Against codehs/bottleneck)
```bash
gh pr create \
  --base master \
  --head $(git branch --show-current) \
  --repo codehs/bottleneck \
  --title "Your Feature Title" \
  --body "Description with context"
```

### 4. (Optional) Push First
If local changes haven't been pushed:
```bash
git push origin $(git branch --show-current)
```

## PR Description Template

Based on commits and diff:

```
[Brief description of what this PR does]

**Changes:**
- [Bullet point of major changes]
- [Another major change]

**Related thread:** [Amp thread URL if applicable]
```

## For This Repo Specifically

This repo uses the **optimistic updates pattern** for GitHub API operations. When creating PRs with voting/linking/mutation features:

- Reference the AGENTS.md optimistic updates documentation
- Mention any stores affected (issueStore, prStore, etc.)
- Note loading states on individual objects (`isPerformingOperation`)
- Include thread reference where the feature was developed

### Example PR for bottleneck (Upstream codehs/bottleneck)

```bash
gh pr create \
  --base master \
  --head voting \
  --repo codehs/bottleneck \
  --title "Add thumbs up/down votes on comments" \
  --body "Add the ability to vote on comments with thumbs up/down reactions that propagate to GitHub.

Implemented with optimistic updates pattern for instant UI feedback.

**Changes:**
- Vote UI components in comment timeline
- Vote state management with GitHub API integration  
- Thumbs up/down reactions that sync to GitHub
- Conversation tab enhancements

**Made with:** https://ampcode.com/threads/T-019c6970-fc60-751d-ba0f-b68c9af62b35"
```

## Key Points

- **Always push first** if you have unpushed commits
- **Use descriptive titles** - they become the merge commit message
- **Reference threads** in PR body for development context
- **Check commit count** - `git log master..HEAD --oneline` should show your work
- **Verify target branch** - default is `master`, not `main` in this repo
- **Always specify `--repo codehs/bottleneck`** - PRs ALWAYS go to the upstream repo, not forks

## Debugging

If `gh pr create` fails with "No commits between":
```bash
# Ensure you're on the right branch
git status

# Verify commits exist
git log master..HEAD

# Check remote status
git fetch origin master
git log origin/master..HEAD
```
