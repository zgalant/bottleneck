import { create } from "zustand";
import { PullRequest } from "../services/github";

export type ActivityType = 'pr_opened' | 'pr_merged' | 'pr_closed' | 'comment' | 'review' | 'commit' | 'pr_comment';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  repo: string;
  repoOwner: string;
  
  // PR activity
  prNumber?: number;
  prTitle?: string;
  prBody?: string | null;
  author?: {
    login: string;
    avatar_url: string;
  };
  
  // Comment activity
  commentBody?: string;
  commentAuthor?: {
    login: string;
    avatar_url: string;
  };
  
  // Review activity
  reviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  reviewer?: {
    login: string;
    avatar_url: string;
  };
  
  // Commit activity
  commitSha?: string;
  commitMessage?: string;
  commitAuthor?: {
    name: string;
    email: string;
  };
  
  // PR comment activity
  isCommentMention?: boolean;
  isAssignedPR?: boolean;
  isFollowedPR?: boolean;
}

interface ActivityState {
  activities: Activity[];
  selectedRepos: string[]; // Format: "owner/repo"
  autoUpdate: boolean;
  lastUpdate: Date | null;

  // Actions
  setSelectedRepos: (repos: string[]) => void;
  loadSelectedRepos: () => Promise<void>;
  toggleAutoUpdate: (enabled: boolean) => void;
  generateActivitiesFromPRs: (pullRequests: Map<string, PullRequest>, currentUserLogin?: string) => void;
  getActivitiesByRepo: (repoKey: string) => Activity[];
  getAllActivities: () => Activity[];
}

// Load selected repos from electron store
const loadSelectedReposFromStore = async (): Promise<string[]> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("feedSelectedRepos");
      if (result.success && result.value) {
        return result.value as string[];
      }
    } catch (error) {
      console.error("Failed to load feed selected repos:", error);
    }
  }
  return [];
};

// Save selected repos to electron store
const saveSelectedReposToStore = async (repos: string[]) => {
  if (window.electron) {
    try {
      await window.electron.settings.set("feedSelectedRepos", repos);
    } catch (error) {
      console.error("Failed to save feed selected repos:", error);
    }
  }
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  selectedRepos: [],
  autoUpdate: true,
  lastUpdate: null,

  setSelectedRepos: (repos: string[]) => {
    set({ selectedRepos: repos });
    // Save to persistent storage
    saveSelectedReposToStore(repos);
  },

  loadSelectedRepos: async () => {
    const repos = await loadSelectedReposFromStore();
    set({ selectedRepos: repos });
  },

  toggleAutoUpdate: (enabled: boolean) => {
    set({ autoUpdate: enabled });
  },

  generateActivitiesFromPRs: (pullRequests: Map<string, PullRequest>, currentUserLogin?: string) => {
    const activities: Activity[] = [];

    pullRequests.forEach((pr) => {
      // Check if user is assigned to this PR
      const isUserAssigned = currentUserLogin ? pr.assignees.some(a => a.login === currentUserLogin) : false;
      
      // Check if user is mentioned in PR body or requested for review
      const isUserMentioned = currentUserLogin ? (
        pr.body?.includes(`@${currentUserLogin}`) ||
        pr.requested_reviewers.some(r => r.login === currentUserLogin)
      ) : false;

      // PR opened activity
      activities.push({
        id: `pr-opened-${pr.id}`,
        type: 'pr_opened',
        timestamp: new Date(pr.created_at),
        repo: pr.base.repo.name,
        repoOwner: pr.base.repo.owner.login,
        prNumber: pr.number,
        prTitle: pr.title,
        prBody: pr.body,
        author: pr.user,
      });

      // PR merged activity
      if (pr.merged_at) {
        activities.push({
          id: `pr-merged-${pr.id}`,
          type: 'pr_merged',
          timestamp: new Date(pr.merged_at),
          repo: pr.base.repo.name,
          repoOwner: pr.base.repo.owner.login,
          prNumber: pr.number,
          prTitle: pr.title,
          prBody: pr.body,
          author: pr.user,
        });
      }

      // PR closed activity
      if (pr.state === 'closed' && !pr.merged_at) {
        activities.push({
          id: `pr-closed-${pr.id}`,
          type: 'pr_closed',
          timestamp: new Date(pr.closed_at!),
          repo: pr.base.repo.name,
          repoOwner: pr.base.repo.owner.login,
          prNumber: pr.number,
          prTitle: pr.title,
          prBody: pr.body,
          author: pr.user,
        });
      }

      // Review activities
      if (pr.approvedBy && pr.approvedBy.length > 0) {
        pr.approvedBy.forEach((reviewer, idx) => {
          activities.push({
            id: `review-approved-${pr.id}-${idx}`,
            type: 'review',
            timestamp: new Date(pr.updated_at),
            repo: pr.base.repo.name,
            repoOwner: pr.base.repo.owner.login,
            prNumber: pr.number,
            prTitle: pr.title,
            prBody: pr.body,
            reviewState: 'APPROVED',
            reviewer,
          });
        });
      }

      if (pr.changesRequestedBy && pr.changesRequestedBy.length > 0) {
        pr.changesRequestedBy.forEach((reviewer, idx) => {
          activities.push({
            id: `review-changes-${pr.id}-${idx}`,
            type: 'review',
            timestamp: new Date(pr.updated_at),
            repo: pr.base.repo.name,
            repoOwner: pr.base.repo.owner.login,
            prNumber: pr.number,
            prTitle: pr.title,
            prBody: pr.body,
            reviewState: 'CHANGES_REQUESTED',
            reviewer,
          });
        });
      }
      
      // Comment activity for PRs user is assigned to or mentioned in
      if ((isUserAssigned || isUserMentioned) && pr.comments > 0) {
        activities.push({
          id: `pr-comment-${pr.id}`,
          type: 'pr_comment',
          timestamp: new Date(pr.updated_at),
          repo: pr.base.repo.name,
          repoOwner: pr.base.repo.owner.login,
          prNumber: pr.number,
          prTitle: pr.title,
          prBody: pr.body,
          commentAuthor: pr.user,
          isAssignedPR: isUserAssigned,
          isCommentMention: isUserMentioned,
        });
      }
    });

    // Sort by timestamp, latest first
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    set({
      activities,
      lastUpdate: new Date(),
    });
  },

  getActivitiesByRepo: (repoKey: string) => {
    const state = get();
    const [owner, name] = repoKey.split('/');
    return state.activities.filter(
      (a) => a.repoOwner === owner && a.repo === name
    );
  },

  getAllActivities: () => {
    const state = get();
    const selectedRepos = state.selectedRepos;

    if (selectedRepos.length === 0) {
      return state.activities;
    }

    return state.activities.filter((a) => {
      const repoKey = `${a.repoOwner}/${a.repo}`;
      return selectedRepos.includes(repoKey);
    });
  },
}));
