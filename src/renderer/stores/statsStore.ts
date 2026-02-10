import { create } from "zustand";
import { PullRequest } from "../services/github";

export interface PersonStats {
  name: string;
  login: string;
  avatarUrl?: string;
  totalPRs: number;
  open: number;
  draft: number;
  merged: number;
  closed: number;
}

export interface PersonCurrentStats {
  login: string;
  name: string;
  avatarUrl?: string;
  open: number;
  draft: number;
  assignedForReview: number;
}

export interface StalenessStatus {
  draft: number;
  readyForReview: number;
  approved: number;
}

export interface StalenessDistribution {
  '4hours': StalenessStatus;
  '1day': StalenessStatus;
  '2days': StalenessStatus;
  '3days': StalenessStatus;
  '4to10days': StalenessStatus;
  '10plus': StalenessStatus;
}

export interface CurrentSnapshot {
  totalOpen: number;
  totalDraft: number;
  readyToShip: number;
  reviewedByPerson: Map<string, { name: string; avatarUrl?: string; reviewCount: number }>;
  personStats: PersonCurrentStats[];
  stalenessDistribution: StalenessDistribution;
}

export interface ActivityPeriod {
  label: string;
  days: number;
  merged: Map<string, { name: string; avatarUrl?: string; count: number }>;
  reviewed: Map<string, { name: string; avatarUrl?: string; count: number }>;
}

interface StatsState {
  currentSnapshot: CurrentSnapshot | null;
  activity: ActivityPeriod[];
  loading: boolean;

  // Actions
  calculateStats: (pullRequests: Map<string, PullRequest>) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  currentSnapshot: null,
  activity: [],
  loading: false,

  calculateStats: (pullRequests: Map<string, PullRequest>) => {
    set({ loading: true });

    const now = new Date();
    const snapshot = calculateCurrentSnapshot(pullRequests);
    const activity = calculateActivity(pullRequests, now);

    set({
      currentSnapshot: snapshot,
      activity,
      loading: false,
    });
  },
}));

function calculateCurrentSnapshot(pullRequests: Map<string, PullRequest>): CurrentSnapshot {
  let totalOpen = 0;
  let totalDraft = 0;
  let readyToShip = 0;
  const reviewedByPerson = new Map<string, { name: string; avatarUrl?: string; reviewCount: number }>();
  const personStatsMap = new Map<string, PersonCurrentStats>();
  const stalenessDistribution: StalenessDistribution = {
    '4hours': { draft: 0, readyForReview: 0, approved: 0 },
    '1day': { draft: 0, readyForReview: 0, approved: 0 },
    '2days': { draft: 0, readyForReview: 0, approved: 0 },
    '3days': { draft: 0, readyForReview: 0, approved: 0 },
    '4to10days': { draft: 0, readyForReview: 0, approved: 0 },
    '10plus': { draft: 0, readyForReview: 0, approved: 0 },
  };

  const now = new Date();

  pullRequests.forEach((pr) => {
    // Count current open and draft PRs
    if (pr.state === 'open') {
      if (pr.draft) {
        totalDraft++;
      } else {
        totalOpen++;
      }

      // Count ready to ship: approved OR has shipit label
      const hasApproval =
        pr.review_decision === 'approved' ||
        (Array.isArray(pr.approvedBy) && pr.approvedBy.length > 0);
      const hasShipitLabel =
        Array.isArray(pr.labels) &&
        pr.labels.some((l: any) => l.name === 'shipit');

      if (hasApproval || hasShipitLabel) {
        readyToShip++;
      }

      // Categorize by staleness based on last update
      const lastUpdated = new Date(pr.updated_at);
      const hoursAgo = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      const daysAgo = hoursAgo / 24;

      // Determine PR status
      const hasApprovalForStatus =
        pr.review_decision === 'approved' ||
        (Array.isArray(pr.approvedBy) && pr.approvedBy.length > 0);

      let bucket: keyof StalenessDistribution;
      if (hoursAgo <= 4) {
        bucket = '4hours';
      } else if (daysAgo <= 1) {
        bucket = '1day';
      } else if (daysAgo <= 2) {
        bucket = '2days';
      } else if (daysAgo <= 3) {
        bucket = '3days';
      } else if (daysAgo <= 10) {
        bucket = '4to10days';
      } else {
        bucket = '10plus';
      }

      if (pr.draft) {
        stalenessDistribution[bucket].draft++;
      } else if (hasApprovalForStatus) {
        stalenessDistribution[bucket].approved++;
      } else {
        stalenessDistribution[bucket].readyForReview++;
      }

      // Count per-person open/draft stats
      const authorLogin = pr.user.login;
      if (!personStatsMap.has(authorLogin)) {
        personStatsMap.set(authorLogin, {
          login: authorLogin,
          name: pr.user.login,
          avatarUrl: pr.user.avatar_url,
          open: 0,
          draft: 0,
          assignedForReview: 0,
        });
      }
      const stats = personStatsMap.get(authorLogin)!;
      if (pr.draft) {
        stats.draft++;
      } else {
        stats.open++;
      }
    }

    // Count reviewers assigned to review
    if (Array.isArray(pr.requested_reviewers)) {
      pr.requested_reviewers.forEach((reviewer) => {
        const login = reviewer.login;
        if (!personStatsMap.has(login)) {
          personStatsMap.set(login, {
            login,
            name: reviewer.login,
            avatarUrl: reviewer.avatar_url,
            open: 0,
            draft: 0,
            assignedForReview: 0,
          });
        }
        personStatsMap.get(login)!.assignedForReview++;
      });
    }

    // Count reviewers who have reviewed this PR (approved or changes requested)
    if (pr.approvedBy) {
      pr.approvedBy.forEach((reviewer) => {
        const key = reviewer.login;
        if (!reviewedByPerson.has(key)) {
          reviewedByPerson.set(key, {
            name: reviewer.login,
            avatarUrl: reviewer.avatar_url,
            reviewCount: 0,
          });
        }
        reviewedByPerson.get(key)!.reviewCount++;
      });
    }

    if (pr.changesRequestedBy) {
      pr.changesRequestedBy.forEach((reviewer) => {
        const key = reviewer.login;
        if (!reviewedByPerson.has(key)) {
          reviewedByPerson.set(key, {
            name: reviewer.login,
            avatarUrl: reviewer.avatar_url,
            reviewCount: 0,
          });
        }
        reviewedByPerson.get(key)!.reviewCount++;
      });
    }
  });

  // Convert to array and sort by most open
  const personStats = Array.from(personStatsMap.values()).sort(
    (a, b) => b.open - a.open
  );

  return {
    totalOpen,
    totalDraft,
    readyToShip,
    reviewedByPerson,
    personStats,
    stalenessDistribution,
  };
}

function calculateActivity(pullRequests: Map<string, PullRequest>, now: Date): ActivityPeriod[] {
  const periods: ActivityPeriod[] = [
    { label: '1 day', days: 1, merged: new Map(), reviewed: new Map() },
    { label: '7 days', days: 7, merged: new Map(), reviewed: new Map() },
    { label: '30 days', days: 30, merged: new Map(), reviewed: new Map() },
  ];

  pullRequests.forEach((pr) => {
    periods.forEach((period) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - period.days);

      // Check if PR was merged in this period
      if (pr.merged_at) {
        const mergedDate = new Date(pr.merged_at);
        if (mergedDate >= cutoffDate && mergedDate <= now) {
          const authorKey = pr.user.login;
          if (!period.merged.has(authorKey)) {
            period.merged.set(authorKey, {
              name: pr.user.login,
              avatarUrl: pr.user.avatar_url,
              count: 0,
            });
          }
          period.merged.get(authorKey)!.count++;
        }
      }

      // Check if PR was reviewed in this period (approved or changes requested)
      if (pr.approvedBy) {
        pr.approvedBy.forEach((reviewer) => {
          // For simplicity, use the PR's updated_at as the review timestamp
          // In a real app, you'd have individual review timestamps
          const reviewDate = new Date(pr.updated_at);
          if (reviewDate >= cutoffDate && reviewDate <= now) {
            const reviewerKey = reviewer.login;
            if (!period.reviewed.has(reviewerKey)) {
              period.reviewed.set(reviewerKey, {
                name: reviewer.login,
                avatarUrl: reviewer.avatar_url,
                count: 0,
              });
            }
            period.reviewed.get(reviewerKey)!.count++;
          }
        });
      }

      if (pr.changesRequestedBy) {
        pr.changesRequestedBy.forEach((reviewer) => {
          const reviewDate = new Date(pr.updated_at);
          if (reviewDate >= cutoffDate && reviewDate <= now) {
            const reviewerKey = reviewer.login;
            if (!period.reviewed.has(reviewerKey)) {
              period.reviewed.set(reviewerKey, {
                name: reviewer.login,
                avatarUrl: reviewer.avatar_url,
                count: 0,
              });
            }
            period.reviewed.get(reviewerKey)!.count++;
          }
        });
      }
    });
  });

  return periods;
}
