# Statistics Component

Comprehensive PR statistics and analytics for tracking team productivity and PR metrics.

## Features

### Overview Cards
- **Total PRs**: Overall count of PRs in selected time range
- **Open PRs**: Currently open pull requests
- **Merged**: Successfully merged PRs
- **Draft**: Draft PRs

### Repository Statistics
Shows per-repository breakdown with:
- Open, Draft, In Review, Approved, Merged, Closed counts
- Visual progress bar showing PR distribution
- Filterable by individual repos or all

### PR Authors
Table view of all PR authors with:
- Avatar and username
- Total PR count
- Open, Draft, Merged, Closed breakdown
- Sortable by PR count

### Reviewer Activity
Shows review statistics for team members:
- Pending reviews awaiting action
- Approved reviews completed
- Changes requested count
- Dismissed reviews
- Activity indicator bar

## Filters

### Time Range
- Last 7 days
- Last 30 days
- Last 90 days
- All time

### Repository Selection
- Individual repo selection
- Multi-select dropdown
- "All repositories" quick selection
- Filters all statistics to selected repos

## Architecture

### Store: `statsStore.ts`
Zustand store managing:
- `repoStats`: Per-repository PR breakdown
- `personStats`: Per-author PR statistics
- `reviewerStats`: Per-reviewer review statistics
- `filters`: Time range and selected repos
- `calculateStats()`: Recalculates all metrics from PR data

### Components
- **StatsFiltersBar**: Time range and repo selection dropdowns
- **StatsOverview**: Overview stat cards
- **RepoStatsSection**: Repository-level statistics
- **PersonStatsSection**: Author/contributor statistics table
- **ReviewerStatsSection**: Reviewer activity cards

### View: `StatsView.tsx`
Main container that:
- Fetches and calculates stats when PRs change
- Handles filter updates
- Renders all stat sections with responsive grid layout

## Usage

The stats view is accessible from the main sidebar under "Statistics". It automatically syncs with the PR store and updates when:
- PRs are fetched or updated
- Time range filter is changed
- Repository selection is modified
