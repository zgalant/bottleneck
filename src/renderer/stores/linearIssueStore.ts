import { create } from "zustand";
import { LinearAPI, LinearIssue } from "../services/linear";
import { usePRStore } from "./prStore";
import { useSettingsStore } from "./settingsStore";
import { getAllLinearIdsFromPRs, buildLinearIssueToPRMap } from "../utils/linearLinks";
import { PullRequest } from "../services/github";

interface LinearIssueState {
  issues: Map<string, LinearIssue>; // keyed by identifier (e.g., "ENG-123")
  loading: boolean;
  error: string | null;
  lastFetchedRepo: string | null;

  fetchIssuesForRepo: (owner: string, repo: string, force?: boolean) => Promise<void>;
  getIssueByIdentifier: (identifier: string) => LinearIssue | undefined;
  clearIssues: () => void;
}

/**
 * Convert a PR to the linkedPR format used by LinearIssue
 */
function prToLinkedPR(pr: PullRequest) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state as "open" | "closed",
    draft: pr.draft || false,
    merged: pr.merged || false,
    approvalStatus: pr.approvalStatus,
    author: pr.user
      ? {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
        }
      : undefined,
  };
}

export const useLinearIssueStore = create<LinearIssueState>((set, get) => ({
  issues: new Map(),
  loading: false,
  error: null,
  lastFetchedRepo: null,

  fetchIssuesForRepo: async (owner: string, repo: string, force = false) => {
    const repoKey = `${owner}/${repo}`;
    console.log(`[LINEAR] 🔄 fetchIssuesForRepo: ${repoKey} (force=${force})`);

    // Skip if already loading
    if (get().loading) {
      console.log(`[LINEAR] ⏸️  Already loading, skipping`);
      return;
    }

    // Skip if already loaded for this repo (unless forced)
    if (get().lastFetchedRepo === repoKey && !force) {
      console.log(`[LINEAR] ✅ Already loaded for ${repoKey}, skipping`);
      return;
    }

    // Get Linear API key from settings
    const { settings } = useSettingsStore.getState();
    const apiKey = settings.linearApiKey;

    if (!apiKey) {
      console.log(`[LINEAR] ⚠️  No Linear API key configured`);
      set({ error: "Linear API key not configured", loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Get all PRs from the PR store
      const prStore = usePRStore.getState();
      const pullRequests = prStore.pullRequests;

      console.log(`[LINEAR] 📦 PR store has ${pullRequests.size} total PRs`);
      
      // Debug: Log PRs for this repo
      let repoCount = 0;
      for (const pr of pullRequests.values()) {
        const prRepoOwner = pr.base?.repo?.owner?.login;
        const prRepoName = pr.base?.repo?.name;
        if (prRepoOwner === owner && prRepoName === repo) {
          repoCount++;
          console.log(`[LINEAR] 🔍 PR #${pr.number}: "${pr.title}"`, {
            hasBody: !!pr.body,
            bodyLength: pr.body?.length || 0,
            bodyPreview: pr.body?.substring(0, 200) || "(no body)",
          });
        }
      }
      console.log(`[LINEAR] 📊 Found ${repoCount} PRs for ${owner}/${repo}`);

      // Extract all Linear issue IDs from PR descriptions
      const linearIds = getAllLinearIdsFromPRs(pullRequests, owner, repo);
      console.log(`[LINEAR] 📋 Found ${linearIds.length} Linear issue IDs in PRs:`, linearIds);

      if (linearIds.length === 0) {
        console.log(`[LINEAR] ℹ️  No Linear issues referenced in PRs`);
        set({
          issues: new Map(),
          loading: false,
          lastFetchedRepo: repoKey,
        });
        return;
      }

      // Fetch issues from Linear API
      const api = new LinearAPI(apiKey);
      const issues = await api.getIssuesByIdentifiers(linearIds);
      console.log(`[LINEAR] ✅ Fetched ${issues.length} issues from Linear`);

      // Build the map of Linear ID -> PRs
      const linearToPRMap = buildLinearIssueToPRMap(pullRequests, owner, repo);

      // Enrich issues with linked PRs
      const issueMap = new Map<string, LinearIssue>();
      for (const issue of issues) {
        const linkedPRs = (linearToPRMap.get(issue.identifier) || []).map(prToLinkedPR);
        issueMap.set(issue.identifier, {
          ...issue,
          linkedPRs,
        });
      }

      set({
        issues: issueMap,
        loading: false,
        lastFetchedRepo: repoKey,
      });
    } catch (error) {
      console.error(`[LINEAR] ❌ Error fetching issues:`, error);
      set({
        error: (error as Error).message,
        loading: false,
      });
    }
  },

  getIssueByIdentifier: (identifier: string) => {
    return get().issues.get(identifier);
  },

  clearIssues: () => {
    set({
      issues: new Map(),
      lastFetchedRepo: null,
      error: null,
    });
  },
}));
