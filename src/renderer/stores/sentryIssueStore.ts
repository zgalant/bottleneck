import { create } from "zustand";
import { SentryIssue, fetchSentryIssues } from "../services/sentry";
import { usePRStore } from "./prStore";
import { getAllSentryIdsFromPRs, buildSentryIssueToPRMap } from "../utils/sentryLinks";
import { PullRequest } from "../services/github";

interface SentryIssueState {
  issues: Map<string, SentryIssue>; // keyed by identifier (shortId or numericId)
  loading: boolean;
  error: string | null;
  lastFetchedRepo: string | null;

  fetchIssuesForRepo: (owner: string, repo: string, force?: boolean) => Promise<void>;
  relinkIssuesForRepo: (owner: string, repo: string) => void;
  getIssueByIdentifier: (identifier: string) => SentryIssue | undefined;
  clearIssues: () => void;
}

/**
 * Convert a PR to the linkedPR format used by SentryIssue
 */
function prToLinkedPR(pr: PullRequest) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state as "open" | "closed",
    draft: pr.draft || false,
    merged: pr.merged || false,
    approvalStatus: pr.approvalStatus,
    updatedAt: pr.updated_at,
    author: pr.user
      ? {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
        }
      : undefined,
  };
}

export const useSentryIssueStore = create<SentryIssueState>((set, get) => ({
  issues: new Map(),
  loading: false,
  error: null,
  lastFetchedRepo: null,

  fetchIssuesForRepo: async (owner: string, repo: string, force = false) => {
    const repoKey = `${owner}/${repo}`;
    console.log(`[SENTRY] 🔄 fetchIssuesForRepo: ${repoKey} (force=${force})`);

    // Skip if already loading
    if (get().loading) {
      console.log(`[SENTRY] ⏸️  Already loading, skipping`);
      return;
    }

    // Skip if already loaded for this repo (unless forced)
    if (get().lastFetchedRepo === repoKey && !force) {
      console.log(`[SENTRY] ✅ Already loaded for ${repoKey}, skipping`);
      return;
    }

    set({ loading: true, error: null });

    try {
      // Get all PRs from the PR store
      const prStore = usePRStore.getState();
      const pullRequests = prStore.pullRequests;

      console.log(`[SENTRY] 📦 PR store has ${pullRequests.size} total PRs`);

      // Extract all Sentry issue IDs from PR descriptions
      const sentryIds = getAllSentryIdsFromPRs(pullRequests, owner, repo);
      console.log(`[SENTRY] 📋 Found ${sentryIds.length} Sentry issue IDs in PRs:`, sentryIds);

      if (sentryIds.length === 0) {
        console.log(`[SENTRY] ℹ️  No Sentry issues referenced in PRs`);
        set({
          issues: new Map(),
          loading: false,
          lastFetchedRepo: repoKey,
        });
        return;
      }

      // Fetch issues from Sentry CLI
      const issues = await fetchSentryIssues(sentryIds);
      console.log(`[SENTRY] ✅ Fetched ${issues.length} issues from Sentry`);

      // Build the map of Sentry ID -> PRs
      const sentryToPRMap = buildSentryIssueToPRMap(pullRequests, owner, repo);

      // Get existing issues to preserve state
      const existingIssues = get().issues;

      // Create the new issues map, enriched with linked PRs
      const issueMap = new Map<string, SentryIssue>();

      for (const issue of issues) {
        // Key by both shortId and numeric ID for lookup
        const keys = [issue.shortId, issue.id].filter(Boolean);
        
        // Find linked PRs for this issue
        const linkedPRsList: PullRequest[] = [];
        for (const key of keys) {
          const prs = sentryToPRMap.get(key);
          if (prs) {
            linkedPRsList.push(...prs);
          }
        }

        // Dedupe PRs by number
        const uniquePRs = Array.from(
          new Map(linkedPRsList.map(pr => [pr.number, pr])).values()
        );

        // Preserve existing linkedPRs if we have them
        const existingIssue = existingIssues.get(issue.shortId) || existingIssues.get(issue.id);
        
        const enrichedIssue: SentryIssue = {
          ...issue,
          linkedPRs: uniquePRs.length > 0
            ? uniquePRs.map(prToLinkedPR)
            : existingIssue?.linkedPRs,
        };

        // Store under shortId (primary) and numeric id
        if (issue.shortId) {
          issueMap.set(issue.shortId, enrichedIssue);
        }
        if (issue.id) {
          issueMap.set(issue.id, enrichedIssue);
        }
      }

      set({
        issues: issueMap,
        loading: false,
        lastFetchedRepo: repoKey,
      });

      console.log(`[SENTRY] ✅ Store updated with ${issueMap.size} entries`);
    } catch (error) {
      console.error(`[SENTRY] ❌ Error fetching issues:`, error);
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },

  relinkIssuesForRepo: (owner: string, repo: string) => {
    const prStore = usePRStore.getState();
    const pullRequests = prStore.pullRequests;
    const sentryToPRMap = buildSentryIssueToPRMap(pullRequests, owner, repo);

    const existingIssues = get().issues;
    const updatedIssues = new Map<string, SentryIssue>();

    for (const [key, issue] of existingIssues.entries()) {
      const linkedPRs = sentryToPRMap.get(key);
      updatedIssues.set(key, {
        ...issue,
        linkedPRs: linkedPRs?.map(prToLinkedPR) ?? issue.linkedPRs,
      });
    }

    set({ issues: updatedIssues });
  },

  getIssueByIdentifier: (identifier: string) => {
    return get().issues.get(identifier) || get().issues.get(identifier.toUpperCase());
  },

  clearIssues: () => {
    set({
      issues: new Map(),
      lastFetchedRepo: null,
      error: null,
    });
  },
}));
