import { create } from "zustand";
import { GitHubAPI, PullRequest, Repository } from "../services/github";
import { mockPullRequests } from "../mockData";

interface PRGroup {
  id: string;
  prefix: string;
  pattern: string;
  prs: PullRequest[];
  count: number;
  openCount: number;
  mergedCount: number;
  closedCount: number;
}

export interface PRFilters {
  author: string;
  agent: string;
}

export type PRFilterType = 'open' | 'draft' | 'review-requested' | 'merged' | 'closed';

interface PRState {
  pullRequests: Map<string, PullRequest>;
  repoPRCache: Map<string, Map<string, PullRequest>>; // repoFullName -> PRs Map
  repositories: Repository[];
  selectedRepo: Repository | null;
  recentlyViewedRepos: Repository[];
  loadedRepos: Set<string>;
  currentRepoKey: string | null;
  pendingRepoKey: string | null;
  filters: PRFilters;
  statusFilters: PRFilterType[];
  groups: PRGroup[];
  loading: boolean;
  error: string | null;
  isFetchingRepositories: boolean;
  revision: number; // Increments on any PR data change, used to trigger dependent updates

  fetchPullRequests: (
    owner: string,
    repo: string,
    force?: boolean,
    options?: {
      replaceStore?: boolean;
    },
  ) => Promise<void>;
  fetchPRDetails: (
    owner: string,
    repo: string,
    pullNumber: number,
    options?: {
      updateStore?: boolean;
    },
  ) => Promise<PullRequest | null>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (repo: Repository | null) => void;
  addToRecentlyViewed: (repo: Repository) => void;
  removeFromRecentlyViewed: (repoId: number) => void;
  setFilter: (filter: PRFilterType) => void;
  setFilters: (filters: Partial<PRFilters>) => void;
  setStatusFilter: (filter: PRFilterType) => void;
  setStatusFilters: (filters: PRFilterType[]) => void;
  removeStatusFilter: (filter: PRFilterType) => void;
  clearFilters: () => void;
  groupPRsByPrefix: () => void;
  updatePR: (pr: PullRequest) => void;
  bulkUpdatePRs: (prs: PullRequest[]) => void;
  fetchPRStats: (owner: string, repo: string, prNumbers: number[]) => Promise<void>;
  purgeMergedPRs: (daysAgo?: number) => number;
}

// Load recently viewed repos from electron store on initialization
const loadRecentlyViewedRepos = async (): Promise<Repository[]> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("recentlyViewedRepos");
      if (result.success && result.value) {
        return result.value as Repository[];
      }
    } catch (error) {
      console.error("Failed to load recently viewed repos:", error);
    }
  }
  return [];
};

// Save recently viewed repos to electron store
const saveRecentlyViewedRepos = async (repos: Repository[]) => {
  if (window.electron) {
    try {
      await window.electron.settings.set("recentlyViewedRepos", repos);
    } catch (error) {
      console.error("Failed to save recently viewed repos:", error);
    }
  }
};

// Load selected repo from electron store
const loadSelectedRepo = async (): Promise<Repository | null> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("selectedRepo");
      if (result.success && result.value) {
        return result.value as Repository;
      }
    } catch (error) {
      console.error("Failed to load selected repo:", error);
    }
  }
  return null;
};

// Save selected repo to electron store
const saveSelectedRepo = async (repo: Repository | null) => {
  if (window.electron) {
    try {
      await window.electron.settings.set("selectedRepo", repo);
    } catch (error) {
      console.error("Failed to save selected repo:", error);
    }
  }
};

// Load PR cache from electron store
const loadPRCache = async (): Promise<Map<string, Map<string, PullRequest>>> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("prCache");
      if (result.success && result.value) {
        const cached = result.value as Record<string, Record<string, any>>;
        const cache = new Map<string, Map<string, PullRequest>>();
        
        for (const [repoKey, prs] of Object.entries(cached)) {
          const prMap = new Map<string, PullRequest>();
          for (const [key, pr] of Object.entries(prs)) {
            prMap.set(key, pr as PullRequest);
          }
          cache.set(repoKey, prMap);
        }
        
        return cache;
      }
    } catch (error) {
      console.error("Failed to load PR cache:", error);
    }
  }
  return new Map();
};

// Save PR cache to electron store (debounced)
let cacheSaveTimer: NodeJS.Timeout | null = null;
const savePRCache = async (cache: Map<string, Map<string, PullRequest>>) => {
  if (cacheSaveTimer) {
    clearTimeout(cacheSaveTimer);
  }
  
  cacheSaveTimer = setTimeout(async () => {
    if (window.electron) {
      try {
        const cacheObj: Record<string, Record<string, any>> = {};
        
        for (const [repoKey, prMap] of cache.entries()) {
          cacheObj[repoKey] = {};
          for (const [key, pr] of prMap.entries()) {
            cacheObj[repoKey][key] = pr;
          }
        }
        
        await window.electron.settings.set("prCache", cacheObj);
        console.log(`[PRStore] Saved PR cache for ${cache.size} repos`);
      } catch (error) {
        console.error("Failed to save PR cache:", error);
      }
    }
  }, 5000); // Debounce by 5 seconds
};

export const usePRStore = create<PRState>((set, get) => {
  // Initialize from storage
  Promise.all([loadRecentlyViewedRepos(), loadSelectedRepo(), loadPRCache()]).then(
    ([recentRepos, selectedRepo, prCache]) => {
      const updates: Partial<PRState> = {};

      if (recentRepos.length > 0) {
        updates.recentlyViewedRepos = recentRepos;
      }

      // Restore PR cache
      if (prCache.size > 0) {
        updates.repoPRCache = prCache;
      }

      // Use the saved selected repo, or fall back to the most recent one
      if (selectedRepo) {
        // Try to restore cached PRs for this repo
        const repoKey = `${selectedRepo.owner}/${selectedRepo.name}`;
        if (prCache.has(repoKey)) {
          updates.pullRequests = prCache.get(repoKey)!;
          updates.currentRepoKey = repoKey;
        }
        updates.selectedRepo = selectedRepo;
      } else if (recentRepos.length > 0) {
        updates.selectedRepo = recentRepos[0];
      }

      if (Object.keys(updates).length > 0) {
        set(updates as PRState);

        // Don't auto-fetch here - let the sync store handle initial fetch
        // This prevents duplicate fetches on hard refresh
      }
    },
  );

  return {
    pullRequests: new Map(),
    repoPRCache: new Map(),
    repositories: [],
    selectedRepo: null,
    recentlyViewedRepos: [],
    loadedRepos: new Set(),
    currentRepoKey: null,
    pendingRepoKey: null,
    filters: {
      author: "all",
      agent: "all",
    },
    statusFilters: [],
    groups: [],
    loading: false,
    error: null,
    isFetchingRepositories: false,
    revision: 0,

    fetchPullRequests: async (
      owner: string,
      repo: string,
      force = false,
      options = {},
    ) => {
      const repoFullName = `${owner}/${repo}`;
      const { replaceStore = true } = options;
      const { loading, pendingRepoKey, currentRepoKey } = get();

      console.log(`[PRStore] fetchPullRequests called for ${repoFullName}`, {
        force,
        replaceStore,
        loading,
        currentRepoKey,
        pendingRepoKey,
      });

      if (replaceStore) {
        if (loading) {
          if (!force && pendingRepoKey === repoFullName) {
            return;
          }
          if (!force && pendingRepoKey && pendingRepoKey !== repoFullName) {
            return;
          }
        }

        const needsFetch = force || currentRepoKey !== repoFullName;

        if (!needsFetch) {
          return;
        }

        set({
          loading: true,
          error: null,
          pendingRepoKey: repoFullName,
        });
      }

      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) throw new Error("Not authenticated");

        let prs: PullRequest[];

        // Use mock data for dev token
        if (token === "dev-token") {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 500));
          prs = mockPullRequests as PullRequest[];
        } else {
          const api = new GitHubAPI(token);
          
          // Fetch open and draft PRs first (fast sync)
          const openPRs = await api.getOpenAndDraftPullRequests(owner, repo);
          console.log("Fetched open/draft PRs from API:", openPRs.length);
          
          // Fetch recently merged PRs (last 30 days)
          const mergedPRs = await api.getRecentlyMergedPullRequests(owner, repo, 30);
          console.log("Fetched merged PRs from API:", mergedPRs.length);
          
          // Combine both
          prs = [...openPRs, ...mergedPRs];
        }

        const prMap = new Map<string, PullRequest>();
        prs.forEach((pr) => {
          prMap.set(`${owner}/${repo}#${pr.number}`, pr);
        });

        console.log("Setting PR map with", prs.length, "PRs");
        if (prs.length > 0) {
          console.log("First PR:", prs[0]);
        }

        if (replaceStore) {
          set((state) => {
            // Add to repoPRCache
            const newCache = new Map(state.repoPRCache);
            newCache.set(repoFullName, prMap);
            
            return {
              pullRequests: prMap,
              repoPRCache: newCache,
              loading: false,
              currentRepoKey: repoFullName,
              pendingRepoKey: null,
              revision: state.revision + 1,
            };
          });

          // Auto-group PRs after fetching
          get().groupPRsByPrefix();
        }
      } catch (error) {
        if (replaceStore) {
          set({
            error: (error as Error).message,
            loading: false,
            pendingRepoKey: null,
          });
        } else {
          console.error(
            `Failed to fetch pull requests for ${repoFullName}:`,
            error,
          );
        }
      }
    },

    fetchPRDetails: async (
      owner: string,
      repo: string,
      pullNumber: number,
      options = {},
    ) => {
      const { updateStore = true } = options;
      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) return null;

        // Don't fetch details if using mock data
        if (token === "dev-token") {
          return null;
        }

        const api = new GitHubAPI(token);
        const detailedPR = await api.getPullRequest(owner, repo, pullNumber);

        // Update the PR in our store with the detailed data
        const prKey = `${owner}/${repo}#${pullNumber}`;
        const currentPR = get().pullRequests.get(prKey);

        if (currentPR) {
          // Merge the detailed data with existing data
          const updatedPR = {
            ...currentPR,
            ...detailedPR,
            // Ensure we keep the file stats from the detailed fetch
            changed_files: detailedPR.changed_files,
            additions: detailedPR.additions,
            deletions: detailedPR.deletions,
          };

          if (updateStore) {
            get().updatePR(updatedPR);

            console.log(`Updated PR #${pullNumber} with detailed data:`, {
              changed_files: updatedPR.changed_files,
              additions: updatedPR.additions,
              deletions: updatedPR.deletions,
            });
          }

          return updatedPR;
        }

        return detailedPR;
      } catch (error) {
        console.error(`Failed to fetch PR details for #${pullNumber}:`, error);
        return null;
      }
    },

    fetchRepositories: async () => {
      const start = performance.now();
      console.log("⏱️ [PR_STORE] fetchRepositories started");

      // Prevent concurrent calls
      const state = get();
      if (state.isFetchingRepositories) {
        console.log("⏱️ [PR_STORE] Already fetching repositories, skipping...");
        return;
      }

      set({ loading: true, error: null, isFetchingRepositories: true });

      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) {
          set({ loading: false, isFetchingRepositories: false });
          return;
        }

        let repos: Repository[];

        // Use mock repositories for dev token
        if (token === "dev-token") {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 300));
          repos = [
            {
              id: 1,
              owner: "dev-user",
              name: "bottleneck",
              full_name: "dev-user/bottleneck",
              description: "Fast GitHub PR review and branch management",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/dev-user/bottleneck.git",
              updated_at: new Date(Date.now() - 3600000).toISOString(),
              pushed_at: new Date(Date.now() - 3600000).toISOString(),
              stargazers_count: 42,
              open_issues_count: 5,
            },
            {
              id: 2,
              owner: "dev-user",
              name: "sample-project",
              full_name: "dev-user/sample-project",
              description: "A sample project for testing",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/dev-user/sample-project.git",
              updated_at: new Date(Date.now() - 86400000).toISOString(),
              pushed_at: new Date(Date.now() - 86400000).toISOString(),
              stargazers_count: 10,
              open_issues_count: 2,
            },
            {
              id: 3,
              owner: "my-org",
              name: "enterprise-app",
              full_name: "my-org/enterprise-app",
              description: "Enterprise application with microservices",
              default_branch: "main",
              private: true,
              clone_url: "https://github.com/my-org/enterprise-app.git",
              updated_at: new Date(Date.now() - 7200000).toISOString(),
              pushed_at: new Date(Date.now() - 7200000).toISOString(),
              stargazers_count: 128,
              open_issues_count: 15,
            },
            {
              id: 4,
              owner: "my-org",
              name: "ui-components",
              full_name: "my-org/ui-components",
              description: "Shared UI component library",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/my-org/ui-components.git",
              updated_at: new Date(Date.now() - 172800000).toISOString(),
              pushed_at: new Date(Date.now() - 172800000).toISOString(),
              stargazers_count: 256,
              open_issues_count: 8,
            },
            {
              id: 5,
              owner: "another-org",
              name: "api-gateway",
              full_name: "another-org/api-gateway",
              description: "API gateway service",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/another-org/api-gateway.git",
              updated_at: new Date(Date.now() - 1800000).toISOString(),
              pushed_at: new Date(Date.now() - 1800000).toISOString(),
              stargazers_count: 89,
              open_issues_count: 3,
            },
          ];
        } else {
          const api = new GitHubAPI(token);
          // getRepositories() handles pagination internally and returns all repos
          repos = await api.getRepositories();
        }

        set({
          repositories: repos,
          loading: false,
          isFetchingRepositories: false,
        });

        console.log(`⏱️ [PR_STORE] Fetched ${repos.length} repositories in ${(performance.now() - start).toFixed(2)}ms`);
      } catch (error) {
        console.error(`⏱️ [PR_STORE] fetchRepositories failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
        set({
          error: (error as Error).message,
          loading: false,
          isFetchingRepositories: false,
        });
      }
    },

    setSelectedRepo: (repo) => {
      set((state) => {
        if (!repo) {
          return {
            selectedRepo: null,
            pullRequests: new Map(),
            currentRepoKey: null,
            pendingRepoKey: null,
          };
        }

        // Try to restore from cache first
        const repoKey = `${repo.owner}/${repo.name}`;
        const cachedPRs = state.repoPRCache.get(repoKey);
        
        return {
          selectedRepo: repo,
          pullRequests: cachedPRs || new Map(),
          currentRepoKey: cachedPRs ? repoKey : null,
        };
      });

      // Save to electron store
      saveSelectedRepo(repo);

      if (repo) {
        get().addToRecentlyViewed(repo);
      }
    },

    addToRecentlyViewed: (repo) => {
      set((state) => {
        const filtered = state.recentlyViewedRepos.filter(
          (r) => r.id !== repo.id,
        );
        const newRecent = [repo, ...filtered].slice(0, 5); // Keep only 5 most recent

        // Save to electron store
        saveRecentlyViewedRepos(newRecent);

        return { recentlyViewedRepos: newRecent };
      });
    },

    removeFromRecentlyViewed: (repoId) => {
      set((state) => {
        const filtered = state.recentlyViewedRepos.filter(
          (r) => r.id !== repoId,
        );

        // Save to electron store
        saveRecentlyViewedRepos(filtered);

        return { recentlyViewedRepos: filtered };
      });
    },

    setFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.includes(filter)
          ? state.statusFilters.filter((f) => f !== filter)
          : [...state.statusFilters, filter],
      }));
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: {
          ...state.filters,
          ...newFilters,
        },
      }));
    },

    setStatusFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.includes(filter)
          ? state.statusFilters.filter((f) => f !== filter)
          : [...state.statusFilters, filter],
      }));
    },

    setStatusFilters: (newFilters) => {
      set({
        statusFilters: newFilters,
      });
    },

    removeStatusFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.filter((f) => f !== filter),
      }));
    },

    clearFilters: () => {
      set({
        filters: {
          author: "all",
          agent: "all",
        },
        statusFilters: [],
      });
    },

    groupPRsByPrefix: () => {
      const { pullRequests } = get();
      const groups = new Map<string, PRGroup>();

      // Group PRs by common prefixes
      pullRequests.forEach((pr) => {
        // Try to extract prefix from title or branch
        const title = pr.title?.toLowerCase?.() ?? "";
        const branch = pr.head?.ref?.toLowerCase?.() ?? "";

        let prefix = "";

        // Check for common patterns
        const patterns = [
          /^(feat|fix|chore|docs|style|refactor|test|build|ci)[\/:]/,
          /^([a-z]+)[\/:]/,
          /^([a-z]+-\d+)[\/:]/,
        ];

        for (const pattern of patterns) {
          const titleMatch = title.match(pattern);
          const branchMatch = branch.match(pattern);

          if (titleMatch) {
            prefix = titleMatch[1];
            break;
          } else if (branchMatch) {
            prefix = branchMatch[1];
            break;
          }
        }

        if (prefix && prefix.length >= 3) {
          if (!groups.has(prefix)) {
            groups.set(prefix, {
              id: prefix,
              prefix,
              pattern: `${prefix}/*`,
              prs: [],
              count: 0,
              openCount: 0,
              mergedCount: 0,
              closedCount: 0,
            });
          }

          const group = groups.get(prefix)!;
          group.prs.push(pr);
          group.count++;

          if (pr.state === "open") group.openCount++;
          else if (pr.merged) group.mergedCount++;
          else if (pr.state === "closed") group.closedCount++;
        }
      });

      set({ groups: Array.from(groups.values()) });
    },

    updatePR: (pr) => {
      set((state) => {
        const newPRs = new Map(state.pullRequests);
        const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
        const repoKey = `${pr.base.repo.owner.login}/${pr.base.repo.name}`;

        // Merge with existing PR to preserve loading states if not explicitly cleared
        const existing = newPRs.get(key);
        const merged = existing ? { ...existing, ...pr } : pr;

        newPRs.set(key, merged);
        
        // Also update cache
        const newCache = new Map(state.repoPRCache);
        const repoPRs = newCache.get(repoKey) || new Map<string, PullRequest>();
        repoPRs.set(key, merged);
        newCache.set(repoKey, repoPRs);
        
        return { 
          pullRequests: newPRs,
          repoPRCache: newCache,
          revision: state.revision + 1,
        };
      });

      // Debounce save
      savePRCache(get().repoPRCache);

      // Re-group after update
      get().groupPRsByPrefix();
    },

    bulkUpdatePRs: (prs) => {
      set((state) => {
        const newPRs = new Map(state.pullRequests);
        const newCache = new Map(state.repoPRCache);
        let added = false;

        prs.forEach((pr) => {
          const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
          const repoKey = `${pr.base.repo.owner.login}/${pr.base.repo.name}`;

          // Only add PRs that don't exist in the store
          // This prevents background fetches from overwriting user actions with stale API data
          if (!newPRs.has(key)) {
            newPRs.set(key, pr);
            added = true;
            
            // Also update cache
            const repoPRs = newCache.get(repoKey) || new Map<string, PullRequest>();
            repoPRs.set(key, pr);
            newCache.set(repoKey, repoPRs);
          }
          // If PR exists, don't overwrite it - store is source of truth
        });
        
        return { 
          pullRequests: newPRs,
          repoPRCache: newCache,
          revision: added ? state.revision + 1 : state.revision,
        };
      });

      // Debounce save
      savePRCache(get().repoPRCache);

      // Re-group after bulk update
      get().groupPRsByPrefix();
    },

    fetchPRStats: async (owner: string, repo: string, prNumbers: number[]) => {
      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token || token === "dev-token") return;

        const api = new GitHubAPI(token);
        const stats = await api.fetchPRStatistics(owner, repo, prNumbers);

        // Update the PRs with the fetched stats
        set((state) => {
          const newPRs = new Map(state.pullRequests);
          let updated = false;
          stats.forEach((stat, prNumber) => {
            const prKey = `${owner}/${repo}#${prNumber}`;
            const pr = newPRs.get(prKey);
            if (pr) {
              newPRs.set(prKey, {
                ...pr,
                additions: stat.additions,
                deletions: stat.deletions,
                changed_files: stat.changed_files,
              });
              updated = true;
            }
          });
          return { 
            pullRequests: newPRs,
            revision: updated ? state.revision + 1 : state.revision,
          };
        });
      } catch (error) {
        console.error("Failed to fetch PR stats:", error);
      }
    },

    purgeMergedPRs: (daysAgo = 4) => {
      const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
      let purgedCount = 0;

      set((state) => {
        const newPRs = new Map(state.pullRequests);
        const newCache = new Map(state.repoPRCache);

        // Purge from repoPRCache
        for (const [repoKey, prMap] of newCache.entries()) {
          const newPrMap = new Map(prMap);
          for (const [key, pr] of prMap.entries()) {
            if (pr.merged && pr.merged_at && new Date(pr.merged_at).getTime() < cutoff) {
              newPrMap.delete(key);
              newPRs.delete(key);
              purgedCount++;
            }
          }
          if (newPrMap.size > 0) {
            newCache.set(repoKey, newPrMap);
          } else {
            newCache.delete(repoKey);
          }
        }

        return {
          pullRequests: newPRs,
          repoPRCache: newCache,
          revision: purgedCount > 0 ? state.revision + 1 : state.revision,
        };
      });

      if (purgedCount > 0) {
        savePRCache(get().repoPRCache);
        get().groupPRsByPrefix();
      }

      console.log(`[PRStore] Purged ${purgedCount} merged PRs older than ${daysAgo} days`);
      return purgedCount;
    },
  };
});
