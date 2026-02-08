import { useUIStore } from "../stores/uiStore";

export function setupKeyboardShortcuts() {
  if (!window.electron) {
    console.warn(
      "window.electron not available, skipping keyboard shortcuts setup",
    );
    return () => { };
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const {
      toggleSidebar,
      toggleRightPanel,
      toggleCommandPalette,
      toggleKeyboardShortcuts,
    } = useUIStore.getState();

    // Command/Ctrl key combinations
    if (e.metaKey || e.ctrlKey) {
      // Toggle sidebar (Cmd/Ctrl + B)
      if ((e.key === "b" || e.key === "B") && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Toggle right panel (Cmd/Ctrl + Shift + B)
      if ((e.key === "b" || e.key === "B") && e.shiftKey) {
        e.preventDefault();
        toggleRightPanel();
        return;
      }

      // Open PR palette (Cmd/Ctrl + P)
      if ((e.key === "p" || e.key === "P") && !e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().togglePRPalette();
        return;
      }

      // Open/toggle command palette (Cmd/Ctrl + K)
      if ((e.key === "k" || e.key === "K") && !e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Show keyboard shortcuts (Cmd/Ctrl + /)
      if (e.key === "/") {
        e.preventDefault();
        toggleKeyboardShortcuts();
        return;
      }

      // Toggle theme (Cmd/Ctrl + Shift + T)
      if ((e.key === "t" || e.key === "T") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleTheme();
        return;
      }

      // Toggle diff view (Cmd/Ctrl + Shift + D)
      if ((e.key === "d" || e.key === "D") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleDiffView();
        return;
      }

      // Toggle whitespace (Cmd/Ctrl + Shift + W)
      if ((e.key === "w" || e.key === "W") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWhitespace();
        return;
      }

      // Add label (Cmd/Ctrl + L) - only on PR detail page (handled via menu IPC)
      // This fallback is kept for the renderer keyboard handler, but the menu
      // handles the actual shortcut detection on macOS/Windows

      // Toggle word wrap (Cmd/Ctrl + Shift + L)
      if ((e.key === "l" || e.key === "L") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWordWrap();
        return;
      }

      // Go to PR homepage (Cmd/Ctrl + Shift + A)
      if ((e.key === "a" || e.key === "A") && e.shiftKey) {
        e.preventDefault();
        const nav = (window as any).__commandNavigate;
        if (nav) nav("/pulls");
        return;
      }

      // Focus comment box (Cmd/Ctrl + Shift + C)
      if ((e.key === "c" || e.key === "C") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().triggerFocusCommentBox();
        return;
      }

      // Go to home/PR list (Cmd/Ctrl + Shift + H)
      if ((e.key === "h" || e.key === "H") && e.shiftKey) {
        e.preventDefault();
        const nav = (window as any).__commandNavigate;
        if (nav) nav("/pulls");
        return;
      }

      // Go to notifications (Cmd/Ctrl + Shift + N)
      if ((e.key === "n" || e.key === "N") && e.shiftKey) {
        e.preventDefault();
        const nav = (window as any).__commandNavigate;
        if (nav) nav("/notifications");
        return;
      }

      // Open URLs palette (Cmd/Ctrl + O) - only on PR detail page
      if ((e.key === "o" || e.key === "O") && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pr-action:open-urls"));
        return;
      }

      // Navigate back (Cmd/Ctrl + Left Arrow)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const pathMatch = window.location.pathname.match(/^\/pulls\/([^/]+)\/([^/]+)\/(\d+)$/);
        if (pathMatch) {
          const nav = (window as any).__commandNavigate;
          // Use the 'from' state if available, otherwise fall back to /pulls
          const historyState = window.history.state?.usr;
          const backPath = historyState?.from || "/pulls";
          if (nav) nav(backPath);
        }
        return;
      }

      // Go to settings (Cmd/Ctrl + ,)
      if (e.key === ",") {
        e.preventDefault();
        const nav = (window as any).__commandNavigate;
        if (nav) nav("/settings");
        return;
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  // Listen to IPC events from the main process menu
  const handleToggleSidebar = () => {
    useUIStore.getState().toggleSidebar();
  };

  const handleToggleRightPanel = () => {
    useUIStore.getState().toggleRightPanel();
  };

  const handleOpenCommandPalette = () => {
    useUIStore.getState().toggleCommandPalette();
  };

  const handleOpenPRPalette = () => {
    useUIStore.getState().togglePRPalette();
  };

  const handleShowShortcuts = () => {
    useUIStore.getState().toggleKeyboardShortcuts();
  };

  const handleAddLabel = () => {
    const pathMatch = window.location.pathname.match(/^\/pulls\/([^/]+)\/([^/]+)\/(\d+)$/);
    if (pathMatch) {
      useUIStore.getState().setAddLabelDialogOpen(true);
    }
  };

  window.electron.on("toggle-sidebar", handleToggleSidebar);
  window.electron.on("toggle-right-panel", handleToggleRightPanel);
  window.electron.on("open-command-palette", handleOpenCommandPalette);
  window.electron.on("open-pr-palette", handleOpenPRPalette);
  window.electron.on("show-shortcuts", handleShowShortcuts);
  window.electron.on("add-label", handleAddLabel);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    window.electron.off("toggle-sidebar", handleToggleSidebar);
    window.electron.off("toggle-right-panel", handleToggleRightPanel);
    window.electron.off("open-command-palette", handleOpenCommandPalette);
    window.electron.off("open-pr-palette", handleOpenPRPalette);
    window.electron.off("show-shortcuts", handleShowShortcuts);
    window.electron.off("add-label", handleAddLabel);
  };
}
