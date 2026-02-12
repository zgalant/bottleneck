import { create } from "zustand";
import { GitHubAPI, ReviewThread, Comment } from "../services/github";
import { isAgentUser, parseAgentPrompt } from "../components/AgentPromptBlock";
import { useAuthStore } from "./authStore";
import { usePRStore } from "./prStore";

export interface DevinComment {
  id: string;
  threadId: string;
  comment: Comment;
  thread: ReviewThread;
  pr: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    author: string;
    authorAvatar: string;
  };
  parsedPrompt: string | null;
  createdAt: Date;
}

interface DevinState {
  comments: DevinComment[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  fetchDevinComments: () => Promise<void>;
  clearComments: () => void;
}

export const useDevinStore = create<DevinState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchDevinComments: async () => {
    const { loading } = get();
    if (loading) return;

    set({ loading: true, error: null });

    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        token = useAuthStore.getState().token;
      }

      if (!token) {
        throw new Error("Not authenticated");
      }

      if (token === "dev-token") {
        // Mock data for dev mode
        set({ comments: [], loading: false, lastFetched: Date.now() });
        return;
      }

      const api = new GitHubAPI(token);

      // Get recently viewed repos from prStore
      const recentRepos = usePRStore.getState().recentlyViewedRepos || [];

      if (recentRepos.length === 0) {
        set({ comments: [], loading: false, lastFetched: Date.now() });
        return;
      }

      const allDevinComments: DevinComment[] = [];

      // Fetch from up to 5 most recent repos
      const reposToFetch = recentRepos.slice(0, 5);

      for (const repo of reposToFetch) {
        try {
          // Get open PRs for this repo
          const openPRs = await api.getOpenAndDraftPullRequests(repo.owner, repo.name);

          // For each open PR, fetch review threads
          for (const pr of openPRs) {
            try {
              const threads = await api.getPullRequestReviewThreads(
                repo.owner,
                repo.name,
                pr.number
              );

              // Filter for unresolved threads with Devin comments
              for (const thread of threads) {
                if (thread.state === "resolved") continue;

                // Check if the first comment is from Devin
                const firstComment = thread.comments[0];
                if (!firstComment || !isAgentUser(firstComment.user.login)) continue;

                // Parse the prompt from the comment
                const { prompt } = parseAgentPrompt(firstComment.body);

                allDevinComments.push({
                  id: `${repo.owner}/${repo.name}#${pr.number}-${thread.id}`,
                  threadId: thread.id,
                  comment: firstComment,
                  thread,
                  pr: {
                    owner: repo.owner,
                    repo: repo.name,
                    number: pr.number,
                    title: pr.title,
                    author: pr.user.login,
                    authorAvatar: pr.user.avatar_url,
                  },
                  parsedPrompt: prompt,
                  createdAt: new Date(firstComment.created_at),
                });
              }
            } catch (err) {
              console.warn(`Failed to fetch threads for PR #${pr.number}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch PRs for ${repo.owner}/${repo.name}:`, err);
        }
      }

      // Sort by created date, newest first
      allDevinComments.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      set({
        comments: allDevinComments,
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error("Failed to fetch Devin comments:", error);
      set({
        error: (error as Error).message,
        loading: false,
      });
    }
  },

  clearComments: () => {
    set({ comments: [], lastFetched: null, error: null });
  },
}));
