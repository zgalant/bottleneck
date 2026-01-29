import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useUIStore } from "./stores/uiStore";
import { usePRStore } from "./stores/prStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useSyncStore } from "./stores/syncStore";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RightPanel from "./components/RightPanel";
import CommandPalette from "./components/CommandPalette";
import PRPalette from "./components/PRPalette";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { setupKeyboardShortcuts } from "./utils/keyboard";
import { cn } from "./utils/cn";
import { PerfLogger } from "./utils/perfLogger";

// Lazy load views for faster initial startup
const PRListView = lazy(() => import("./views/PRListView"));
const PRDetailView = lazy(() => import("./views/PRDetailView"));
const BranchesView = lazy(() => import("./views/BranchesView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
const AuthView = lazy(() => import("./views/AuthView"));
const IssueTrackerView = lazy(() => import("./views/IssueTrackerView"));
const IssueDetailView = lazy(() => import("./views/IssueDetailView"));
const StatsView = lazy(() => import("./views/StatsView"));
const FeedView = lazy(() => import("./views/FeedView"));
const MeView = lazy(() => import("./views/MeView"));
const CursorView = lazy(() => import("./views/CursorView"));
const DevinView = lazy(() => import("./views/DevinView"));
const ChatGPTView = lazy(() => import("./views/ChatGPTView"));
const ShipyardView = lazy(() => import("./views/ShipyardView"));
const FollowingView = lazy(() => import("./views/FollowingView"));
const MigrationsView = lazy(() => import("./views/MigrationsView"));
const FirefighterView = lazy(() => import("./views/FirefighterView"));

PerfLogger.mark("App.tsx module loaded");

function App() {
  PerfLogger.mark("App component function called");

  const { isAuthenticated, checkAuth, token } = useAuthStore();
  const { sidebarOpen, sidebarWidth, setSidebarWidth, rightPanelOpen, theme, setCurrentPage, keyboardShortcutsOpen, toggleKeyboardShortcuts } =
    useUIStore();
  const { loadSettings } = useSettingsStore();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  PerfLogger.mark("App hooks initialized");

  // Track current page for repo switching
  useEffect(() => {
    const pathname = location.pathname;
    // Extract the page type from the pathname
    // For specific PR/issue details, save only the page type (not the specific entity)
    const pagePath = pathname.split('/')[1]; // e.g., 'pulls', 'issues', 'feed', 'me', etc.
    const pageToSave = pagePath ? `/${pagePath}` : '/pulls';
    setCurrentPage(pageToSave);
  }, [location.pathname, setCurrentPage]);

  useEffect(() => {
    PerfLogger.mark("App useEffect (init) started");
    console.log("window.electron:", window.electron);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Loading timeout - forcing app to render");
      setLoading(false);
    }, 3000); // 3 second timeout

    if (window.electron) {
      // Load settings and auth in parallel
      PerfLogger.markStart("Settings & Auth load");
      Promise.all([loadSettings(), checkAuth()])
        .catch((error) => {
          console.error("Error during initialization:", error);
        })
        .finally(() => {
          clearTimeout(timeoutId);
          PerfLogger.markEnd("Settings & Auth load");
          setLoading(false);
          PerfLogger.mark("App loading complete (auth + settings)");
        });

      const keyboardStart = performance.now();
      const cleanup = setupKeyboardShortcuts();
      console.log(`⏱️ [APP] Keyboard shortcuts setup in ${(performance.now() - keyboardStart).toFixed(2)}ms`);

      return () => {
        clearTimeout(timeoutId);
        cleanup();
      };
    } else {
      console.error("window.electron is not available!");
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [checkAuth, loadSettings]);

  // Setup global error handler to suppress Monaco internal diff errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("no diff result available")) {
        // Suppress Monaco's internal diff computation errors
        event.preventDefault();
        console.debug("Suppressed Monaco diff computation error (non-critical)");
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Check if current time is during Central Time weekday daytime hours (9am-6pm CT, Mon-Fri)
  const isCentralTimeDaytime = (): boolean => {
    const now = new Date();
    // Get current time in Central Time
    const centralTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const hour = centralTime.getHours();
    const day = centralTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    const isWeekday = day >= 1 && day <= 5;
    const isDaytime = hour >= 9 && hour < 18; // 9am to 6pm
    
    return isWeekday && isDaytime;
  };

  // Fetch repositories when authenticated and trigger initial sync if needed
  useEffect(() => {
    if (isAuthenticated && token) {
      PerfLogger.mark("Starting repository fetch");
      const fetchStart = performance.now();

      // Call fetchRepositories directly from store to avoid dependency issues
      usePRStore.getState().fetchRepositories().then(() => {
        PerfLogger.mark(`Repository fetch completed in ${(performance.now() - fetchStart).toFixed(2)}ms`);

        // Check if we should do an initial sync
        const syncStore = useSyncStore.getState();
        const lastSync = syncStore.lastSyncTime;
        const now = new Date();

        // Auto-sync if never synced or last sync was more than 5 minutes ago
        if (!lastSync || now.getTime() - lastSync.getTime() > 5 * 60 * 1000) {
          console.log(`[App] Triggering initial sync (lastSync: ${lastSync ? lastSync.toISOString() : 'never'})`);
          // Small delay to let the UI settle
          setTimeout(() => {
            const syncStart = performance.now();
            syncStore.syncAll();
            console.log(`⏱️ [APP] Sync started at ${syncStart.toFixed(2)}ms`);
          }, 1000);
        } else {
          console.log(`[App] Skipping initial sync (last sync was ${Math.round((now.getTime() - lastSync.getTime()) / 1000)}s ago)`);
        }
      });
    }
  }, [isAuthenticated, token]);

  // Periodic sync: every 5 minutes during Central Time weekday daytime, otherwise use settings interval
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const runPeriodicSync = () => {
      const syncStore = useSyncStore.getState();
      if (!syncStore.isSyncing) {
        console.log(`[App] Periodic sync triggered`);
        syncStore.syncAll();
      }
    };

    // Check and sync every minute, but only if enough time has passed
    const checkInterval = setInterval(() => {
      const syncStore = useSyncStore.getState();
      const lastSync = syncStore.lastSyncTime;
      const now = new Date();
      
      // During CT weekday daytime: sync every 5 minutes
      // Otherwise: use the syncInterval from settings (or default 5 min)
      const settings = useSettingsStore.getState();
      const intervalMs = isCentralTimeDaytime() 
        ? 5 * 60 * 1000  // 5 minutes during CT daytime
        : (settings.syncInterval || 5) * 60 * 1000;
      
      if (!lastSync || now.getTime() - lastSync.getTime() >= intervalMs) {
        runPeriodicSync();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [isAuthenticated, token]);

  // Loading component for lazy-loaded views
  const LoadingFallback = () => (
    <div
      className={cn(
        "flex h-screen w-full flex-col items-center justify-center px-6 text-center",
        theme === "dark"
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-200"
          : "bg-gradient-to-b from-slate-100 via-white to-slate-100 text-gray-700",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <div className="text-lg font-semibold">Warming up Bottleneck...</div>
        <p className="max-w-xs text-sm opacity-80">
          Connecting to GitHub and loading your repositories. Sit tight—this only takes a moment.
        </p>
      </div>
    </div>
  );

  if (loading) {
    PerfLogger.mark("App rendering loading screen");
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    PerfLogger.mark("App rendering auth view");
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthView />
      </Suspense>
    );
  }

  PerfLogger.mark("App rendering main UI");

  // Show performance summary on first render
  if ((window as any).__perfSummaryShown !== true) {
    setTimeout(() => {
      PerfLogger.mark("First paint complete");
      PerfLogger.getSummary();
      (window as any).__perfSummaryShown = true;
    }, 100);
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen",
        theme === "dark"
          ? "bg-gray-900 text-gray-100 dark"
          : "bg-white text-gray-900 light",
      )}
    >
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          width={sidebarOpen ? sidebarWidth : 0}
          onWidthChange={setSidebarWidth}
        />

        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/pulls" replace />} />
              <Route path="/pulls" element={<PRListView />} />
              <Route
                path="/pulls/:owner/:repo/:number"
                element={<PRDetailView />}
              />
              <Route path="/branches" element={<BranchesView />} />
              <Route path="/issues" element={<IssueTrackerView />} />
              <Route
                path="/issues/:owner/:repo/:number"
                element={<IssueDetailView />}
              />
              <Route path="/stats" element={<StatsView />} />
              <Route path="/feed" element={<FeedView />} />
              <Route path="/me" element={<MeView />} />
              <Route path="/following" element={<FollowingView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/agents/cursor" element={<CursorView />} />
               <Route path="/agents/devin" element={<DevinView />} />
               <Route path="/agents/chatgpt" element={<ChatGPTView />} />
               <Route path="/shipyard" element={<ShipyardView />} />
               <Route path="/migrations" element={<MigrationsView />} />
               <Route path="/firefighter" element={<FirefighterView />} />
               {/* Catch-all route for unmatched paths */}
               <Route path="*" element={<Navigate to="/pulls" replace />} />
            </Routes>
          </Suspense>
        </main>

        <RightPanel
          className={cn({
            "w-80": rightPanelOpen,
            "w-0": !rightPanelOpen,
          })}
        />
      </div>
      {/* Command Palette Overlay */}
      <CommandPalette />
      {/* PR Palette Overlay */}
      <PRPalette />
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={keyboardShortcutsOpen}
        onClose={toggleKeyboardShortcuts}
        theme={theme}
      />
    </div>
  );
}

export default App;
