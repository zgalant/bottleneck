---
name: creating-upstream-prs
description: Creates pull requests against the upstream codehs/bottleneck repository from a fork. Use when opening PRs to ensure they target upstream, not the fork.
---

# Creating Upstream PRs

Creates pull requests against the upstream CodeHS repository (`codehs/bottleneck`) from a fork.

## Quick Workflow

1. Create feature branch: `git checkout -b feat/your-feature-name`
2. Push to fork: `git push -u origin feat/your-feature-name`
3. Create PR against upstream:
   ```bash
   gh pr create \
     --repo codehs/bottleneck \
     --head zgalant:feat/your-feature-name \
     --base master \
     --title "Your PR Title" \
     --body "PR description"
   ```

## Key Parameters

- `--repo codehs/bottleneck` - Always target upstream, not fork
- `--head zgalant:feat/your-feature-name` - Your fork username + branch name
- `--base master` - Base branch (usually master)
- `--title` - Clear, descriptive title
- `--body` - Detailed description with changes and testing notes

## Example

```bash
gh pr create \
  --repo codehs/bottleneck \
  --head zgalant:feat/file-viewer-improvements \
  --base master \
  --title "File Viewer Improvements: Copy File Path and Add Comments" \
  --body "## Overview
Enhance the file viewer in the PR Files Changed tab.

### Changes
- Added click-to-copy button for filename
- Added Cmd+Option+C shortcut
- Added line comment support with @mention typeahead

### Testing
- Test copy functionality via button and shortcut
- Verify line comments work with @mention suggestions"
```

## Common Mistakes

❌ Creating PR from fork to fork (no `--repo` flag)
✅ Always specify `--repo codehs/bottleneck`

❌ Using just branch name (missing fork username)
✅ Use `zgalant:branch-name` format

❌ Forgetting to push to fork first
✅ Push before creating PR: `git push -u origin branch-name`

## Verify Before Creating PR

```bash
# Ensure feature branch exists locally and on fork
git branch -a | grep feat/your-feature

# Check commits on feature branch
git log origin/master..HEAD --oneline
```
