import { create } from "zustand";
import { GitHubAPI, GitHubNotification } from "../services/github";
import { useAuthStore } from "./authStore";

type ReadFilter = "unread" | "read" | "all";

interface NotificationState {
  notifications: GitHubNotification[];
  loading: boolean;
  enriching: boolean;
  error: string | null;
  filter: ReadFilter;
  selectedIndex: number;

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

  fetchNotifications: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const api = new GitHubAPI(token);
      const filter = get().filter;
      const notifications = await api.getNotifications({
        all: filter !== "unread",
        per_page: 50,
      });

      let filtered = notifications;
      if (filter === "read") {
        filtered = notifications.filter((n) => !n.unread);
      } else if (filter === "unread") {
        filtered = notifications.filter((n) => n.unread);
      }

      filtered.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      set({ notifications: filtered, loading: false, selectedIndex: 0 });

      // Enrich notifications in the background (batch of concurrent requests)
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

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === threadId ? { ...n, unread: false } : n
      ),
    }));

    try {
      const api = new GitHubAPI(token);
      await api.markNotificationAsRead(threadId);

      if (get().filter === "unread") {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== threadId),
        }));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === threadId ? { ...n, unread: true } : n
        ),
      }));
    }
  },

  markAllAsRead: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const prev = get().notifications;

    set((state) => ({
      notifications:
        state.filter === "unread"
          ? []
          : state.notifications.map((n) => ({ ...n, unread: false })),
    }));

    try {
      const api = new GitHubAPI(token);
      await api.markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      set({ notifications: prev });
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
