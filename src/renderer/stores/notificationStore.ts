import { create } from "zustand";
import { GitHubAPI, GitHubNotification } from "../services/github";
import { useAuthStore } from "./authStore";

type ReadFilter = "unread" | "read" | "all";

const CACHE_KEY = "notificationReadIds";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedReadEntry {
  timestamp: number;
}

const loadReadCache = async (): Promise<Set<string>> => {
  if (!window.electron) return new Set();
  try {
    const result = await window.electron.settings.get(CACHE_KEY);
    if (result.success && result.value) {
      const entries = result.value as Record<string, CachedReadEntry>;
      const now = Date.now();
      const valid = new Set<string>();
      for (const [id, entry] of Object.entries(entries)) {
        if (now - entry.timestamp < CACHE_TTL_MS) {
          valid.add(id);
        }
      }
      return valid;
    }
  } catch (error) {
    console.error("Failed to load notification read cache:", error);
  }
  return new Set();
};

const saveReadCache = async (ids: Set<string>) => {
  if (!window.electron) return;
  try {
    const entries: Record<string, CachedReadEntry> = {};
    const now = Date.now();
    for (const id of ids) {
      entries[id] = { timestamp: now };
    }
    await window.electron.settings.set(CACHE_KEY, entries);
  } catch (error) {
    console.error("Failed to save notification read cache:", error);
  }
};

interface NotificationState {
  notifications: GitHubNotification[];
  loading: boolean;
  enriching: boolean;
  error: string | null;
  filter: ReadFilter;
  selectedIndex: number;
  locallyReadIds: Set<string>;

  fetchNotifications: () => Promise<void>;
  setFilter: (filter: ReadFilter) => void;
  markAsRead: (threadId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setSelectedIndex: (index: number) => void;
  moveSelection: (direction: "up" | "down") => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  enriching: false,
  error: null,
  filter: "unread",
  selectedIndex: 0,
  locallyReadIds: new Set(),

  fetchNotifications: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const cachedReadIds = await loadReadCache();
      set({ locallyReadIds: cachedReadIds });

      const api = new GitHubAPI(token);
      const filter = get().filter;
      const notifications = await api.getNotifications({
        all: filter !== "unread",
        per_page: 50,
      });

      const withLocalState = notifications.map((n) =>
        cachedReadIds.has(n.id) ? { ...n, unread: false } : n
      );

      let filtered = withLocalState;
      if (filter === "read") {
        filtered = withLocalState.filter((n) => !n.unread);
      } else if (filter === "unread") {
        filtered = withLocalState.filter((n) => n.unread);
      }

      filtered.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      set({ notifications: filtered, loading: false, selectedIndex: 0 });

      if (filtered.length > 0) {
        set({ enriching: true });
        const batchSize = 5;
        const toEnrich = [...filtered];

        for (let i = 0; i < toEnrich.length; i += batchSize) {
          const batch = toEnrich.slice(i, i + batchSize);
          const enrichments = await Promise.allSettled(
            batch.map((n) => api.enrichNotification(n))
          );

          set((state) => {
            const updated = [...state.notifications];
            for (let j = 0; j < batch.length; j++) {
              const result = enrichments[j];
              if (result.status === "fulfilled") {
                const idx = updated.findIndex((n) => n.id === batch[j].id);
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], enrichment: result.value };
                }
              }
            }
            return { notifications: updated };
          });
        }

        set({ enriching: false });
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ error: "Failed to fetch notifications", loading: false, enriching: false });
    }
  },

  setFilter: (filter: ReadFilter) => {
    set({ filter });
    get().fetchNotifications();
  },

  markAsRead: async (threadId: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const newReadIds = new Set(get().locallyReadIds);
    newReadIds.add(threadId);

    if (get().filter === "unread") {
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== threadId);
        return {
          notifications: updated,
          locallyReadIds: newReadIds,
          selectedIndex: Math.min(state.selectedIndex, Math.max(0, updated.length - 1)),
        };
      });
    } else {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === threadId ? { ...n, unread: false } : n
        ),
        locallyReadIds: newReadIds,
      }));
    }

    saveReadCache(newReadIds);

    try {
      const api = new GitHubAPI(token);
      await api.markNotificationAsRead(threadId);
    } catch (error) {
      console.error("Failed to mark notification as read on GitHub:", error);
    }
  },

  markAllAsRead: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const prev = get().notifications;
    const newReadIds = new Set(get().locallyReadIds);
    for (const n of prev) {
      if (n.unread) newReadIds.add(n.id);
    }

    set((state) => ({
      notifications:
        state.filter === "unread"
          ? []
          : state.notifications.map((n) => ({ ...n, unread: false })),
      locallyReadIds: newReadIds,
      selectedIndex: state.filter === "unread" ? 0 : state.selectedIndex,
    }));

    saveReadCache(newReadIds);

    try {
      const api = new GitHubAPI(token);
      await api.markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all as read on GitHub:", error);
      set({ notifications: prev, locallyReadIds: get().locallyReadIds });
    }
  },

  setSelectedIndex: (index: number) => {
    const { notifications } = get();
    if (notifications.length === 0) return;
    set({ selectedIndex: Math.max(0, Math.min(index, notifications.length - 1)) });
  },

  moveSelection: (direction: "up" | "down") => {
    const { selectedIndex, notifications } = get();
    if (notifications.length === 0) return;
    const next =
      direction === "down"
        ? Math.min(selectedIndex + 1, notifications.length - 1)
        : Math.max(selectedIndex - 1, 0);
    set({ selectedIndex: next });
  },
}));
