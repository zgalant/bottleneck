import { create } from "zustand";

interface FollowedUser {
  login: string;
  avatar_url: string;
}

interface FollowedUsersState {
  followedUsers: Map<string, Map<string, FollowedUser>>;
  isFollowing: (owner: string, repo: string, login: string) => boolean;
  follow: (owner: string, repo: string, login: string, avatar_url: string) => void;
  unfollow: (owner: string, repo: string, login: string) => void;
  getFollowedUsers: (owner: string, repo: string) => FollowedUser[];
  loadFollowedUsers: () => Promise<void>;
}

const getRepoKey = (owner: string, repo: string) => `${owner}/${repo}`;

const serializeForStorage = (map: Map<string, Map<string, FollowedUser>>) => {
  const obj: Record<string, Record<string, FollowedUser>> = {};
  map.forEach((innerMap, repoKey) => {
    obj[repoKey] = {};
    innerMap.forEach((user, login) => {
      obj[repoKey][login] = user;
    });
  });
  return obj;
};

const deserializeFromStorage = (obj: Record<string, Record<string, FollowedUser>> | null): Map<string, Map<string, FollowedUser>> => {
  const map = new Map<string, Map<string, FollowedUser>>();
  if (!obj) return map;
  
  Object.entries(obj).forEach(([repoKey, users]) => {
    const innerMap = new Map<string, FollowedUser>();
    Object.entries(users).forEach(([login, user]) => {
      innerMap.set(login, user);
    });
    map.set(repoKey, innerMap);
  });
  return map;
};

export const useFollowedUsersStore = create<FollowedUsersState>((set, get) => ({
  followedUsers: new Map(),

  isFollowing: (owner: string, repo: string, login: string) => {
    const repoKey = getRepoKey(owner, repo);
    const repoFollowed = get().followedUsers.get(repoKey);
    return repoFollowed?.has(login.toLowerCase()) ?? false;
  },

  follow: (owner: string, repo: string, login: string, avatar_url: string) => {
    const repoKey = getRepoKey(owner, repo);
    set((state) => {
      const newFollowedUsers = new Map(state.followedUsers);
      const repoFollowed = new Map(newFollowedUsers.get(repoKey) || new Map());
      repoFollowed.set(login.toLowerCase(), { login, avatar_url });
      newFollowedUsers.set(repoKey, repoFollowed);
      
      if (window.electron) {
        window.electron.settings.set("followedUsers", serializeForStorage(newFollowedUsers));
      }
      
      return { followedUsers: newFollowedUsers };
    });
  },

  unfollow: (owner: string, repo: string, login: string) => {
    const repoKey = getRepoKey(owner, repo);
    set((state) => {
      const newFollowedUsers = new Map(state.followedUsers);
      const repoFollowed = new Map(newFollowedUsers.get(repoKey) || new Map());
      repoFollowed.delete(login.toLowerCase());
      newFollowedUsers.set(repoKey, repoFollowed);
      
      if (window.electron) {
        window.electron.settings.set("followedUsers", serializeForStorage(newFollowedUsers));
      }
      
      return { followedUsers: newFollowedUsers };
    });
  },

  getFollowedUsers: (owner: string, repo: string) => {
    const repoKey = getRepoKey(owner, repo);
    const repoFollowed = get().followedUsers.get(repoKey);
    return repoFollowed ? Array.from(repoFollowed.values()) : [];
  },

  loadFollowedUsers: async () => {
    if (window.electron) {
      try {
        const result = await window.electron.settings.get("followedUsers");
        if (result.success && result.value) {
          set({ followedUsers: deserializeFromStorage(result.value as Record<string, Record<string, FollowedUser>>) });
        }
      } catch (error) {
        console.error("Failed to load followed users:", error);
      }
    }
  },
}));

useFollowedUsersStore.getState().loadFollowedUsers();
