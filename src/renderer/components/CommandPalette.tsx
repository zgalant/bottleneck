import React, { useEffect, useMemo, useState } from "react";
import { Search, X, GitPullRequest, GitPullRequestDraft } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { useSyncStore } from "../stores/syncStore";
import { useNavigate, useLocation } from "react-router-dom";
import { usePRStore } from "../stores/prStore";
import { getPRIcon, getPRColorClass } from "../utils/prStatus";

interface Command {
  id: string;
  name: string;
  keywords: string;
  shortcut?: string;
  section?: string;
  action: () => void;
  preview?: React.ReactNode;
}

function formatRelativeTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const commands: Command[] = [
  {
    id: "toggle-sidebar",
    name: "Toggle Sidebar",
    keywords: "sidebar view layout",
    shortcut: "⌘B",
    action: () => useUIStore.getState().toggleSidebar(),
    preview: <div>Show / hide sidebar</div>,
  },
  {
    id: "toggle-right-panel",
    name: "Toggle Right Panel",
    keywords: "panel view layout",
    shortcut: "⌘⇧B",
    action: () => useUIStore.getState().toggleRightPanel(),
    preview: <div>Show / hide right panel</div>,
  },
  {
    id: "toggle-theme",
    name: "Toggle Theme",
    keywords: "theme dark light appearance",
    shortcut: "⌘⇧T",
    action: () => useUIStore.getState().toggleTheme(),
    preview: <div>Switch between light / dark mode</div>,
  },
  {
    id: "toggle-diff-view",
    name: "Toggle Diff View",
    keywords: "diff unified split",
    shortcut: "⌘⇧D",
    action: () => useUIStore.getState().toggleDiffView(),
    preview: <div>Switch between unified / split diff</div>,
  },
  {
    id: "toggle-whitespace",
    name: "Toggle Whitespace",
    keywords: "diff whitespace",
    shortcut: "⌘⇧W",
    action: () => useUIStore.getState().toggleWhitespace(),
    preview: <div>Show / hide whitespace changes in diff</div>,
  },
  {
    id: "toggle-wordwrap",
    name: "Toggle Word Wrap",
    keywords: "diff word wrap",
    shortcut: "⌘⇧L",
    action: () => useUIStore.getState().toggleWordWrap(),
    preview: <div>Enable / disable word wrap</div>,
  },
  {
    id: "sync-all",
    name: "Sync Repositories",
    keywords: "sync refresh",
    shortcut: "⌘R",
    action: () => useSyncStore.getState().syncAll(),
    preview: <div>Trigger a full sync of all repositories</div>,
  },
  {
    id: "open-settings",
    name: "Open Settings",
    keywords: "settings preferences",
    shortcut: "⌘,",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/settings");
    },
    preview: <div>Navigate to settings page</div>,
  },
  {
    id: "nav-pull-requests",
    name: "Go to Pull Requests",
    keywords: "navigate pulls pr home",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/pulls");
    },
    preview: <div>Open Pull Request list</div>,
  },
  {
    id: "nav-home",
    name: "Home",
    keywords: "home main start pulls",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/pulls");
    },
    preview: <div>Go to the home page (Pull Requests)</div>,
  },
  {
    id: "nav-branches",
    name: "Go to Branches",
    keywords: "navigate branches",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/branches");
    },
    preview: <div>Open branches view</div>,
  },
  {
    id: "nav-issues",
    name: "Go to Issues",
    keywords: "navigate issues",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/issues");
    },
    preview: <div>Open issues list</div>,
  },
  {
    id: "nav-stats",
    name: "Go to Statistics",
    keywords: "navigate stats analytics metrics dashboard",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/stats");
    },
    preview: <div>View PR statistics and analytics</div>,
  },
  {
    id: "nav-feed",
    name: "Go to Activity Feed",
    keywords: "navigate feed activity stream updates",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/feed");
    },
    preview: <div>View real-time activity from all repositories</div>,
  },
  {
    id: "show-shortcuts",
    name: "Show Keyboard Shortcuts",
    keywords: "help shortcuts",
    shortcut: "⌘/",
    action: () => useUIStore.getState().toggleKeyboardShortcuts(),
    preview: <div>Display keyboard shortcuts help</div>,
  },
];

export default function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const { pullRequests } = usePRStore();
  const navigate = useNavigate();
  const location = useLocation();
  // Expose navigate so that commands array can use it without hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    ((window as any).__commandNavigate) = navigate;
    return () => {
      delete (window as any).__commandNavigate;
    };
  }, [navigate]);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreviewKey, setIsPreviewKey] = useState(false);

  const contextualCommands = useMemo(() => {
    const cmds: Command[] = [];
    
    const prMatch = location.pathname.match(/^\/pulls\/([^/]+)\/([^/]+)\/(\d+)$/);
    if (prMatch) {
      const [, owner, repo, prNumber] = prMatch;
      cmds.push({
        id: "approve-pr",
        name: "Approve PR",
        keywords: "approve review lgtm",
        shortcut: "⌘⇧A",
        action: () => {
          useUIStore.getState().triggerApprovePR();
        },
        preview: <div>Approve this pull request</div>,
      });
      cmds.push({
        id: "focus-comment",
        name: "Add Comment",
        keywords: "comment write reply focus",
        shortcut: "⌘⇧C",
        action: () => {
          useUIStore.getState().triggerFocusCommentBox();
        },
        preview: <div>Focus the comment box to add a comment</div>,
      });
      cmds.push({
        id: "copy-gh-checkout",
        name: "Copy gh pr checkout command",
        keywords: "git checkout gh pr copy clipboard",
        action: () => {
          navigator.clipboard.writeText(`gh pr checkout ${prNumber}`);
        },
        preview: <div>Copy "gh pr checkout {prNumber}" to clipboard</div>,
      });
      cmds.push({
        id: "open-pr-github",
        name: "Open PR on GitHub",
        keywords: "github open browser external link",
        action: () => {
          window.open(`https://github.com/${owner}/${repo}/pull/${prNumber}`, '_blank');
        },
        preview: <div>Open this pull request on GitHub</div>,
      });
      cmds.push({
        id: "open-pr-graphite",
        name: "Open PR on Graphite",
        keywords: "graphite open browser external link stacking",
        action: () => {
          window.open(`https://app.graphite.dev/github/pr/${owner}/${repo}/${prNumber}`, '_blank');
        },
        preview: <div>Open this pull request on Graphite</div>,
      });
    }
    
    return cmds;
  }, [location.pathname]);

  // Create a lookup map for quick PR access by command ID
  const prLookupMap = useMemo(() => {
    const map = new Map<string, any>();
    Array.from(pullRequests.values()).forEach((pr) => {
      map.set(`pr-${pr.id}`, pr);
    });
    return map;
  }, [pullRequests]);

  // Generate PR search commands
  const prCommands = useMemo(() => {
    return Array.from(pullRequests.values())
      .filter((pr) => pr.state === "open")
      .map((pr) => ({
      id: `pr-${pr.id}`,
      name: `#${pr.number} ${pr.title}`,
      keywords: `${pr.number} ${pr.title} ${pr.user.login} ${pr.base.repo.owner.login} ${pr.base.repo.name}`,
      section: "Pull Requests",
      action: () => {
        navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`, {
          state: { activeTab: "conversation" }
        });
      },
      preview: (
        <div className="text-xs">
          <div className="flex items-center space-x-2 mb-2">
            <span className={cn("flex-shrink-0", getPRColorClass(pr))}>
              {(() => {
                const Icon = getPRIcon(pr);
                if (Icon === GitPullRequest) {
                  return <GitPullRequest className="w-4 h-4" />;
                }
                return <Icon className="w-4 h-4" />;
              })()}
            </span>
            <span className="font-medium">{pr.base.repo.owner.login}/{pr.base.repo.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-3 h-3 rounded-full"
            />
            <span>{pr.user.login}</span>
            <span>→</span>
            <span>{pr.base.ref}</span>
          </div>
        </div>
      ),
    })) as Command[];
  }, [pullRequests, navigate]);

  const allCommands = useMemo(() => {
    return [...contextualCommands, ...commands, ...prCommands];
  }, [contextualCommands, prCommands]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.keywords.includes(q),
    );
  }, [query, allCommands]);

  // Group commands by section
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filtered.forEach((cmd) => {
      const section = cmd.section || "Commands";
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(cmd);
    });
    return groups;
  }, [filtered]);

  // Flatten grouped commands for index tracking
  const flattenedForIndex = useMemo(() => {
    const result: (Command | null)[] = [];
    Object.keys(groupedCommands).forEach((section) => {
      groupedCommands[section].forEach((cmd) => {
        result.push(cmd);
      });
    });
    return result;
  }, [groupedCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flattenedForIndex.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        flattenedForIndex[selectedIndex]?.action();
        toggleCommandPalette();
      }
      if (e.metaKey || e.ctrlKey) {
        setIsPreviewKey(true);
      } else {
        setIsPreviewKey(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [commandPaletteOpen, flattenedForIndex, selectedIndex, toggleCommandPalette]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-12">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={toggleCommandPalette}
      />
      <div
        className="relative w-full max-w-3xl mx-4 h-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        <div className="flex items-center px-4 border-b h-12 gap-2 border-gray-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={toggleCommandPalette} className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {flattenedForIndex.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No commands</li>
          )}
          {Object.keys(groupedCommands).map((section) => (
            <div key={section}>
              <li className={cn(
                "px-4 py-1.5 text-xs font-semibold uppercase tracking-wide",
                "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50"
              )}>
                {section}
              </li>
              {groupedCommands[section].map((cmd) => {
                const globalIdx = flattenedForIndex.indexOf(cmd);
                const isPR = cmd.id.startsWith("pr-");
                const pr = isPR ? prLookupMap.get(cmd.id) : null;
                
                return (
                  <li
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => {
                      cmd.action();
                      toggleCommandPalette();
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer",
                      isPR ? "text-sm" : "text-sm",
                      globalIdx === selectedIndex
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isPR && pr && (
                        <>
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            title={pr.user.login}
                          />
                          <span className={cn("flex-shrink-0", getPRColorClass(pr))}>
                            {pr.draft ? (
                              <GitPullRequestDraft className="w-4 h-4" />
                            ) : (
                              <GitPullRequest className="w-4 h-4" />
                            )}
                          </span>
                        </>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{cmd.name}</span>
                        {isPR && pr && (
                          <span className={cn(
                            "text-xs truncate block",
                            globalIdx === selectedIndex
                              ? "text-gray-600 dark:text-gray-400"
                              : "text-gray-500 dark:text-gray-500"
                          )}>
                            {formatRelativeTime(pr.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {cmd.shortcut && <span className="opacity-60 ml-2 flex-shrink-0">{cmd.shortcut}</span>}
                  </li>
                );
              })}
            </div>
          ))}
        </ul>
        {isPreviewKey && flattenedForIndex[selectedIndex]?.preview && (
          <div
            className="border-t px-4 py-3 text-sm border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            {flattenedForIndex[selectedIndex].preview}
          </div>
        )}
      </div>
    </div>
  );
}