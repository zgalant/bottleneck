import { create } from "zustand";
import { PullRequest } from "../services/github";

export interface RepoStats {
  repo: string;
  owner: string;
  open: number;
  draft: number;
  inReview: number;
  approved: number;
  closed: number;
  merged: number;
  totalPRs: number;
}

export interface PersonStats {
  name: string;
  avatarUrl?: string;
  totalPRs: number;
  open: number;
  merged: number;
  closed: number;
  draft: number;
}

export interface ReviewerStats {
  name: string;
  avatarUrl?: string;
  pendingReviews: number;
  approved: number;
  changesRequested: number;
  dismissed: number;
}

export interface StatsFilters {
  timeRange: 'week' | 'month' | 'quarter' | 'all';
  selectedRepos: string[]; // Format: "owner/repo"
}

interface StatsState {
  repoStats: Map<string, RepoStats>;
  personStats: Map<string, PersonStats>;
  reviewerStats: Map<string, ReviewerStats>;
  filters: StatsFilters;
  loading: boolean;

  // Actions
  calculateStats: (pullRequests: Map<string, PullRequest>) => void;
  setTimeRange: (range: StatsFilters['timeRange']) => void;
  setSelectedRepos: (repos: string[]) => void;
  clearFilters: () => void;
  getFilteredStats: () => {
    repos: RepoStats[];
    people: PersonStats[];
    reviewers: ReviewerStats[];
  };
}

const DEFAULT_FILTERS: StatsFilters = {
  timeRange: 'month',
  selectedRepos: [],
};

export const useStatsStore = create<StatsState>((set, get) => ({
  repoStats: new Map(),
  personStats: new Map(),
  reviewerStats: new Map(),
  filters: DEFAULT_FILTERS,
  loading: false,

  calculateStats: (pullRequests: Map<string, PullRequest>) => {
    set({ loading: true });

    const repoMap = new Map<string, RepoStats>();
    const personMap = new Map<string, PersonStats>();
    const reviewerMap = new Map<string, ReviewerStats>();

    const now = new Date();
    const timeRange = get().filters.timeRange;
    const filterDateMs = getFilterDate(now, timeRange).getTime();

    pullRequests.forEach((pr) => {
      const createdAt = new Date(pr.created_at).getTime();
      
      // Skip PRs outside time range
      if (createdAt < filterDateMs) {
        return;
      }

      const repoKey = `${pr.base.repo.owner.login}/${pr.base.repo.name}`;
      const authorName = pr.user.login;

      // Update repo stats
      if (!repoMap.has(repoKey)) {
        repoMap.set(repoKey, {
          repo: pr.base.repo.name,
          owner: pr.base.repo.owner.login,
          open: 0,
          draft: 0,
          inReview: 0,
          approved: 0,
          closed: 0,
          merged: 0,
          totalPRs: 0,
        });
      }

      const repoStats = repoMap.get(repoKey)!;
      repoStats.totalPRs++;

      if (pr.merged_at) {
        repoStats.merged++;
      } else if (pr.state === 'closed') {
        repoStats.closed++;
      } else if (pr.draft) {
        repoStats.draft++;
      } else if (pr.approvedBy && pr.approvedBy.length > 0) {
        repoStats.approved++;
      } else if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
        repoStats.inReview++;
      } else {
        repoStats.open++;
      }

      // Update person stats
      if (!personMap.has(authorName)) {
        personMap.set(authorName, {
          name: authorName,
          avatarUrl: pr.user.avatar_url,
          totalPRs: 0,
          open: 0,
          merged: 0,
          closed: 0,
          draft: 0,
        });
      }

      const personStats = personMap.get(authorName)!;
      personStats.totalPRs++;

      if (pr.merged_at) {
        personStats.merged++;
      } else if (pr.state === 'closed') {
        personStats.closed++;
      } else if (pr.draft) {
        personStats.draft++;
      } else {
        personStats.open++;
      }

      // Count approved reviewers
      if (pr.approvedBy && pr.approvedBy.length > 0) {
        pr.approvedBy.forEach((reviewer) => {
          const reviewerName = reviewer.login;

          if (!reviewerMap.has(reviewerName)) {
            reviewerMap.set(reviewerName, {
              name: reviewerName,
              avatarUrl: reviewer.avatar_url,
              pendingReviews: 0,
              approved: 0,
              changesRequested: 0,
              dismissed: 0,
            });
          }

          reviewerMap.get(reviewerName)!.approved++;
        });
      }

      // Count reviewers requesting changes
      if (pr.changesRequestedBy && pr.changesRequestedBy.length > 0) {
        pr.changesRequestedBy.forEach((reviewer) => {
          const reviewerName = reviewer.login;

          if (!reviewerMap.has(reviewerName)) {
            reviewerMap.set(reviewerName, {
              name: reviewerName,
              avatarUrl: reviewer.avatar_url,
              pendingReviews: 0,
              approved: 0,
              changesRequested: 0,
              dismissed: 0,
            });
          }

          reviewerMap.get(reviewerName)!.changesRequested++;
        });
      }

      // Count pending reviews
      if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
        pr.requested_reviewers.forEach((reviewer) => {
          const reviewerName = reviewer.login;

          if (!reviewerMap.has(reviewerName)) {
            reviewerMap.set(reviewerName, {
              name: reviewerName,
              avatarUrl: reviewer.avatar_url,
              pendingReviews: 0,
              approved: 0,
              changesRequested: 0,
              dismissed: 0,
            });
          }

          reviewerMap.get(reviewerName)!.pendingReviews++;
        });
      }
    });

    set({
      repoStats: repoMap,
      personStats: personMap,
      reviewerStats: reviewerMap,
      loading: false,
    });
  },

  setTimeRange: (range: StatsFilters['timeRange']) => {
    set((state) => ({
      filters: { ...state.filters, timeRange: range },
    }));
  },

  setSelectedRepos: (repos: string[]) => {
    set((state) => ({
      filters: { ...state.filters, selectedRepos: repos },
    }));
  },

  clearFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  getFilteredStats: () => {
    const state = get();
    const selectedRepos = state.filters.selectedRepos;

    let repos = Array.from(state.repoStats.values());
    if (selectedRepos.length > 0) {
      repos = repos.filter((r) => selectedRepos.includes(`${r.owner}/${r.repo}`));
    }

    const people = Array.from(state.personStats.values());
    const reviewers = Array.from(state.reviewerStats.values());

    return { repos, people, reviewers };
  },
}));

function getFilterDate(now: Date, range: StatsFilters['timeRange']): Date {
  const date = new Date(now);
  switch (range) {
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'quarter':
      date.setMonth(date.getMonth() - 3);
      break;
    case 'all':
      date.setFullYear(1970); // Far in the past
      break;
  }
  return date;
}
