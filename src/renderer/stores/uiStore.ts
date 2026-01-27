import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SortByType } from "../types/prList";

type PRStatusFilter = "open" | "draft" | "merged" | "closed";

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  rightPanelOpen: boolean;
  commandPaletteOpen: boolean;
  prPaletteOpen: boolean;
  keyboardShortcutsOpen: boolean;
  addReviewersDialogOpen: boolean;
  addLabelDialogOpen: boolean;
  selectedPRs: Set<string>;
  activeView: "list" | "detail";
  diffView: "unified" | "split";
  showWhitespace: boolean;
  wordWrap: boolean;
  theme: "light" | "dark";
  currentPage: string; // Track current page for repo switching

  // PR navigation state for sidebar
  prNavigationState: {
    siblingPRs?: any[];
    currentTaskGroup?: string;
    currentAgent?: string;
    currentPRNumber?: string;
  } | null;

  prListFilters: {
    sortBy: SortByType;
    selectedAuthors: string[];
    selectedStatuses: PRStatusFilter[];
    selectedTeams: string[];
  };

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleRightPanel: () => void;
  toggleCommandPalette: () => void;
  togglePRPalette: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleAddReviewersDialog: () => void;
  setAddReviewersDialogOpen: (open: boolean) => void;
  toggleAddLabelDialog: () => void;
  setAddLabelDialogOpen: (open: boolean) => void;
  toggleDiffView: () => void;
  toggleWhitespace: () => void;
  toggleWordWrap: () => void;
  toggleTheme: () => void;
  selectPR: (prId: string) => void;
  deselectPR: (prId: string) => void;
  clearSelection: () => void;
  setActiveView: (view: "list" | "detail") => void;
  setPRNavigationState: (state: UIState["prNavigationState"]) => void;
  setPRListFilters: (
    filters:
      | Partial<UIState["prListFilters"]>
      | ((filters: UIState["prListFilters"]) => UIState["prListFilters"]),
  ) => void;
  resetPRListFilters: () => void;
  setCurrentPage: (page: string) => void;
  
  // PR action dispatchers - these emit events that PRDetailView listens to
  triggerApprovePR: () => void;
  triggerClosePR: () => void;
  triggerFocusCommentBox: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarWidth: 200, // 200px minimum width
      rightPanelOpen: false,
      commandPaletteOpen: false,
      prPaletteOpen: false,
      keyboardShortcutsOpen: false,
      addReviewersDialogOpen: false,
      addLabelDialogOpen: false,
      selectedPRs: new Set(),
      activeView: "list",
      diffView: "unified",
      showWhitespace: false,
      wordWrap: false,
      theme: "dark",
      currentPage: "/pulls",
      prNavigationState: null,
      prListFilters: {
        sortBy: "updated",
        selectedAuthors: [],
        selectedStatuses: ["open", "draft"],
        selectedTeams: [],
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      togglePRPalette: () =>
        set((state) => ({ prPaletteOpen: !state.prPaletteOpen })),
      toggleKeyboardShortcuts: () =>
        set((state) => ({
          keyboardShortcutsOpen: !state.keyboardShortcutsOpen,
        })),
      toggleAddReviewersDialog: () =>
        set((state) => ({
          addReviewersDialogOpen: !state.addReviewersDialogOpen,
        })),
      setAddReviewersDialogOpen: (open) =>
        set({ addReviewersDialogOpen: open }),
      toggleAddLabelDialog: () =>
        set((state) => ({
          addLabelDialogOpen: !state.addLabelDialogOpen,
        })),
      setAddLabelDialogOpen: (open) =>
        set({ addLabelDialogOpen: open }),
      toggleDiffView: () =>
        set((state) => ({
          diffView: state.diffView === "unified" ? "split" : "unified",
        })),
      toggleWhitespace: () =>
        set((state) => ({ showWhitespace: !state.showWhitespace })),
      toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),

      selectPR: (prId) =>
        set((state) => {
          const newSet = new Set(state.selectedPRs);
          newSet.add(prId);
          return { selectedPRs: newSet };
        }),

      deselectPR: (prId) =>
        set((state) => {
          const newSet = new Set(state.selectedPRs);
          newSet.delete(prId);
          return { selectedPRs: newSet };
        }),

      clearSelection: () => set({ selectedPRs: new Set() }),
      setActiveView: (view) => set({ activeView: view }),
      setPRNavigationState: (state) => set({ prNavigationState: state }),
      setPRListFilters: (filters) =>
        set((state) => ({
          prListFilters:
            typeof filters === "function"
              ? filters(state.prListFilters)
              : {
                ...state.prListFilters,
                ...filters,
              },
        })),
      resetPRListFilters: () =>
        set({
          prListFilters: {
            sortBy: "updated",
            selectedAuthors: [],
            selectedStatuses: ["open", "draft"],
            selectedTeams: [],
          },
        }),
      setCurrentPage: (page) => set({ currentPage: page }),
      
      triggerApprovePR: () => {
        window.dispatchEvent(new CustomEvent("pr-action:approve"));
      },
      triggerClosePR: () => {
        window.dispatchEvent(new CustomEvent("pr-action:close"));
      },
      triggerFocusCommentBox: () => {
        window.dispatchEvent(new CustomEvent("pr-action:focus-comment"));
      },
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        sidebarOpen: state.sidebarOpen,
      }), // Persist theme, sidebar width and open state
    },
  ),
);
