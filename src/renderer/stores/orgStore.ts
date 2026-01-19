import { create } from "zustand";
import { GitHubAPI } from "../services/github";
import { useAuthStore } from "./authStore";

interface OrgMember {
  login: string;
  avatar_url: string;
}

interface OrgState {
  members: Map<string, OrgMember[]>; // org -> members mapping
  loading: Map<string, boolean>; // org -> loading status
  lastFetched: Map<string, number>; // org -> timestamp
  fetchOrgMembers: (org: string, forceRefresh?: boolean) => Promise<OrgMember[]>;
  getCachedMembers: (org: string) => OrgMember[] | null;
}

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const useOrgStore = create<OrgState>((set, get) => ({
  members: new Map(),
  loading: new Map(),
  lastFetched: new Map(),

  fetchOrgMembers: async (org: string, forceRefresh = false) => {
    const state = get();
    const cached = state.members.get(org);
    const lastFetch = state.lastFetched.get(org) ?? 0;
    const now = Date.now();

    // Return cached members if fresh and not force refreshing
    if (
      !forceRefresh &&
      cached &&
      cached.length > 0 &&
      now - lastFetch < CACHE_DURATION
    ) {
      return cached;
    }

    // Don't fetch if already loading
    if (state.loading.get(org)) {
      return cached || [];
    }

    set((s) => {
      const loading = new Map(s.loading);
      loading.set(org, true);
      return { loading };
    });

    try {
      const { token } = useAuthStore.getState();
      const api = new GitHubAPI(token);
      const members = await api.getOrganizationMembers(org);

      set((s) => {
        const newMembers = new Map(s.members);
        const newLastFetched = new Map(s.lastFetched);
        const newLoading = new Map(s.loading);

        newMembers.set(org, members);
        newLastFetched.set(org, now);
        newLoading.set(org, false);

        return {
          members: newMembers,
          lastFetched: newLastFetched,
          loading: newLoading,
        };
      });

      return members;
    } catch (error) {
      console.error(`Error fetching org members for ${org}:`, error);

      set((s) => {
        const newLoading = new Map(s.loading);
        newLoading.set(org, false);
        return { loading: newLoading };
      });

      return cached || [];
    }
  },

  getCachedMembers: (org: string) => {
    const state = get();
    const cached = state.members.get(org);
    const lastFetch = state.lastFetched.get(org) ?? 0;
    const now = Date.now();

    // Return cached members if fresh
    if (cached && cached.length > 0 && now - lastFetch < CACHE_DURATION) {
      return cached;
    }

    return null;
  },
}));
