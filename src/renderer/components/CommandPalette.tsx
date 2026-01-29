import React, { useEffect, useMemo, useState } from "react";
import { Search, X, ExternalLink, Github, Play, Laptop, Rocket, Zap, Flag, Users, Tag, Ship, RefreshCw, Pencil } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { useSyncStore } from "../stores/syncStore";
import { useNavigate, useLocation } from "react-router-dom";
import { usePRStore } from "../stores/prStore";
import { useRepoFavoritesStore } from "../stores/repoFavoritesStore";

import { extractAllURLsFromPR } from "../utils/urlParser";

interface Command {
  id: string;
  name: string;
  keywords: string;
  shortcut?: string;
  section?: string;
  action: () => void;
  preview?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
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
    id: "nav-me",
    name: "My Stuff",
    keywords: "navigate me profile assignments",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/me");
    },
    preview: <div>View your pull request inbox</div>,
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
    id: "nav-shipyard",
    name: "Go to Shipyard",
    keywords: "navigate shipyard ship ready approved shipit",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/shipyard");
    },
    preview: <div>View PRs ready to ship (approved or labeled "shipit")</div>,
  },
  {
    id: "nav-migrations",
    name: "Go to Migrations",
    keywords: "navigate migrations database schema change migration",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/migrations");
    },
    preview: <div>View PRs labeled "change: migration"</div>,
  },
  {
    id: "nav-firefighter",
    name: "Go to Firefighter",
    keywords: "navigate firefighter ff linear ticket emergency",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/firefighter");
    },
    preview: <div>View PRs with FF-* Linear tickets from the last week</div>,
  },
  {
    id: "show-shortcuts",
    name: "Show Keyboard Shortcuts",
    keywords: "help shortcuts",
    shortcut: "⌘/",
    action: () => useUIStore.getState().toggleKeyboardShortcuts(),
    preview: <div>Display keyboard shortcuts help</div>,
  },
  {
    id: "open-pr-palette",
    name: "Go to Pull Request",
    keywords: "navigate pr pull request search find",
    shortcut: "⌘P",
    action: () => {
      useUIStore.getState().toggleCommandPalette();
      setTimeout(() => useUIStore.getState().togglePRPalette(), 50);
    },
    preview: <div>Open PR navigation palette</div>,
  },
];

export default function CommandPalette() {
   const { commandPaletteOpen, toggleCommandPalette, currentPage } = useUIStore();
   const { repositories, setSelectedRepo } = usePRStore();
   const { favorites, loadFavorites } = useRepoFavoritesStore();
   const navigate = useNavigate();
   const location = useLocation();
   // Load favorites and expose navigate
   useEffect(() => {
     loadFavorites();
     ((window as any).__commandNavigate) = navigate;
     ((window as any).__commandSetSelectedRepo) = setSelectedRepo;

     // Listen for trigger to open URL mode
     const handleTriggerURLMode = (e: Event) => {
       const customEvent = e as CustomEvent;
       const pr = customEvent.detail?.pr;
       const comments = customEvent.detail?.comments;
       const reviews = customEvent.detail?.reviews;
       if (pr) {
         setPRForURLs({ ...pr, comments, reviews });
         setIsURLMode(true);
         setQuery("");
         setSelectedIndex(0);
         // Make sure command palette is open
         if (!commandPaletteOpen) {
           toggleCommandPalette();
         }
       }
     };

     window.addEventListener("pr-action:trigger-url-mode", handleTriggerURLMode);

     return () => {
       delete (window as any).__commandNavigate;
       delete (window as any).__commandSetSelectedRepo;
       window.removeEventListener("pr-action:trigger-url-mode", handleTriggerURLMode);
     };
   }, [navigate, loadFavorites, setSelectedRepo, commandPaletteOpen, toggleCommandPalette]);

   const [query, setQuery] = useState("");
   const [selectedIndex, setSelectedIndex] = useState(0);
   const [isPreviewKey, setIsPreviewKey] = useState(false);
   const [isURLMode, setIsURLMode] = useState(false);
   const [prForURLs, setPRForURLs] = useState<any>(null);

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
        id: "close-pr",
        name: "Close PR",
        keywords: "close pr pull request",
        action: () => {
          useUIStore.getState().triggerClosePR();
        },
        preview: <div>Close this pull request without merging</div>,
      });
      cmds.push({
        id: "add-reviewers",
        name: "Add Reviewers",
        keywords: "reviewers add request review",
        icon: Users,
        action: () => {
          useUIStore.getState().setAddReviewersDialogOpen(true);
        },
        preview: <div>Open reviewer selection dialog</div>,
      });
      cmds.push({
        id: "add-label",
        name: "Add Label",
        keywords: "label add tag",
        icon: Tag,
        action: () => {
          useUIStore.getState().setAddLabelDialogOpen(true);
        },
        preview: <div>Open label selection dialog</div>,
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
        id: "edit-description",
        name: "Edit Description",
        keywords: "edit description body update",
        icon: Pencil,
        action: () => {
          useUIStore.getState().triggerEditDescription();
        },
        preview: <div>Edit the PR description (author only)</div>,
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
        id: "ship-it",
        name: "Ship It",
        keywords: "ship shipit approve label merge ready",
        icon: Ship,
        action: () => {
          // Approve PR
          useUIStore.getState().triggerApprovePR();
          // Add shipit label
          window.dispatchEvent(new CustomEvent("pr-action:ship-it"));
        },
        preview: <div>Approve PR and add the "shipit" label</div>,
      });
      cmds.push({
        id: "resync-pr",
        name: "Resync PR",
        keywords: "resync refresh reload sync fetch update",
        icon: RefreshCw,
        action: () => {
          window.dispatchEvent(new CustomEvent("pr-action:resync"));
        },
        preview: <div>Refresh this PR's data from GitHub</div>,
      });
      cmds.push({
        id: "open-urls-palette",
        name: "Open URLs",
        keywords: "urls links open external browse",
        shortcut: "⌘O",
        icon: ExternalLink,
        action: () => {
          useUIStore.getState().toggleCommandPalette();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("pr-action:open-urls"));
          }, 50);
        },
        preview: <div>Open URLs palette for this PR</div>,
      });
    }

    // Add starred repository commands
    if (repositories && favorites.length > 0) {
      const starredRepos = repositories.filter((repo) => {
        const repoKey = repo.full_name || `${repo.owner}/${repo.name}`;
        return favorites.some((f) => f.repoKey === repoKey || f.repoKey === `${repo.owner}/${repo.name}`);
      }).sort((a, b) => {
        const aKey = a.full_name || `${a.owner}/${a.name}`;
        const bKey = b.full_name || `${b.owner}/${b.name}`;
        const aFav = favorites.find((f) => f.repoKey === aKey || f.repoKey === `${a.owner}/${a.name}`);
        const bFav = favorites.find((f) => f.repoKey === bKey || f.repoKey === `${b.owner}/${b.name}`);
        return (aFav?.sortOrder ?? 999) - (bFav?.sortOrder ?? 999);
      });

      if (starredRepos.length > 0) {
        starredRepos.forEach((repo) => {
          cmds.push({
            id: `switch-repo-${repo.id}`,
            name: `Switch to ${repo.full_name}`,
            keywords: `repo switch go navigate ${repo.full_name} ${repo.owner} ${repo.name}`,
            section: "Starred Repos",
            action: () => {
              const setRepo = (window as any).__commandSetSelectedRepo;
              if (setRepo) {
                setRepo(repo);
                // Navigate to the same page type as before (or /pulls if on a detail view)
                const targetPage = currentPage;
                navigate(targetPage);
              }
            },
            preview: <div>Switch to {repo.full_name}</div>,
          });
        });
      }
    }

    return cmds;
  }, [location.pathname, repositories, favorites, navigate, currentPage]);



  // Generate URL commands when in URL mode
   const urlCommands = useMemo(() => {
     if (!isURLMode || !prForURLs) return [];

     // Extract URLs from PR body, comments, and reviews
     const urls = extractAllURLsFromPR(
       prForURLs.body,
       prForURLs.comments || [],
       prForURLs.reviews || []
     );

     // Categorize URLs by domain
     const testing: typeof urls = [];
     const production: typeof urls = [];
     const featureFlags: typeof urls = [];
     const loom: typeof urls = [];
     const other: typeof urls = [];

     urls.forEach((url) => {
       const urlLower = url.url.toLowerCase();
       if (urlLower.includes('internal/feature_flag')) {
         featureFlags.push(url);
       } else if (urlLower.includes('localhost') || urlLower.includes('.dev.codehs.com') || urlLower.includes('staging') || urlLower.includes('stage')) {
         testing.push(url);
       } else if (urlLower.includes('codehs.com')) {
         production.push(url);
       } else if (urlLower.includes('loom.com')) {
         loom.push(url);
       } else {
         other.push(url);
       }
     });

     // Sort each section alphabetically
     testing.sort((a, b) => a.url.toLowerCase().localeCompare(b.url.toLowerCase()));
     production.sort((a, b) => a.url.toLowerCase().localeCompare(b.url.toLowerCase()));
     featureFlags.sort((a, b) => a.url.toLowerCase().localeCompare(b.url.toLowerCase()));
     loom.sort((a, b) => a.url.toLowerCase().localeCompare(b.url.toLowerCase()));
     other.sort((a, b) => a.url.toLowerCase().localeCompare(b.url.toLowerCase()));

     const cmds: Command[] = [
       {
         id: "url-mode-pr-github",
         name: "Open PR on GitHub",
         keywords: "github open browser external link",
         section: "PR",
         icon: Github,
         action: () => {
           window.open(`https://github.com/${prForURLs.base.repo.owner.login}/${prForURLs.base.repo.name}/pull/${prForURLs.number}`, '_blank');
           setIsURLMode(false);
         },
         preview: <div>Open this pull request on GitHub</div>,
       },
       {
         id: "url-mode-pr-graphite",
         name: "Open PR on Graphite",
         keywords: "graphite open browser external link stacking",
         section: "PR",
         icon: ExternalLink,
         action: () => {
           window.open(`https://app.graphite.dev/github/pr/${prForURLs.base.repo.owner.login}/${prForURLs.base.repo.name}/${prForURLs.number}`, '_blank');
           setIsURLMode(false);
         },
         preview: <div>Open this pull request on Graphite</div>,
         },
         {
         id: "url-mode-pr-devinreview",
         name: "Open PR on DevinReview",
         keywords: "devin devinreview review open browser external link ai",
         section: "PR",
         icon: ExternalLink,
         action: () => {
           window.open(`https://devinreview.com/${prForURLs.base.repo.owner.login}/${prForURLs.base.repo.name}/pull/${prForURLs.number}`, '_blank');
           setIsURLMode(false);
         },
         preview: <div>Open this pull request on DevinReview</div>,
         },
         ...testing.map((url, idx) => {
         const urlLower = url.url.toLowerCase();
         const icon = (urlLower.includes('localhost') || urlLower.includes('.dev.codehs.com')) ? Laptop : Zap;

         return {
           id: `url-testing-${idx}`,
           name: url.url,
           keywords: url.url,
           section: "Testing",
           icon,
           action: () => {
             window.open(url.url, '_blank');
             setIsURLMode(false);
           },
         };
         }) as Command[],
       ...production.map((url, idx) => ({
         id: `url-production-${idx}`,
         name: url.url,
         keywords: url.url,
         section: "Production",
         icon: Rocket,
         action: () => {
           window.open(url.url, '_blank');
           setIsURLMode(false);
         },
       })) as Command[],
       ...featureFlags.map((url, idx) => ({
         id: `url-feature-flag-${idx}`,
         name: url.url,
         keywords: url.url,
         section: "Feature Flags",
         icon: Flag,
         action: () => {
           window.open(url.url, '_blank');
           setIsURLMode(false);
         },
       })) as Command[],
       ...loom.map((url, idx) => ({
         id: `url-loom-${idx}`,
         name: url.url,
         keywords: url.url,
         section: "Videos",
         icon: Play,
         action: () => {
           window.open(url.url, '_blank');
           setIsURLMode(false);
         },
       })) as Command[],
       ...other.map((url, idx) => ({
         id: `url-other-${idx}`,
         name: url.url,
         keywords: url.url,
         section: "Other",
         icon: ExternalLink,
         action: () => {
           window.open(url.url, '_blank');
           setIsURLMode(false);
         },
       })) as Command[],
     ];

     return cmds;
   }, [isURLMode, prForURLs]);

  const allCommands = useMemo(() => {
    if (isURLMode) {
      return urlCommands;
    }
    return [...contextualCommands, ...commands];
  }, [contextualCommands, isURLMode, urlCommands]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q),
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
      setIsURLMode(false);
      setPRForURLs(null);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (isURLMode) {
          setIsURLMode(false);
          setPRForURLs(null);
          setQuery("");
        } else {
          toggleCommandPalette();
        }
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
  }, [commandPaletteOpen, flattenedForIndex, selectedIndex, toggleCommandPalette, isURLMode]);

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
         {isURLMode && (
           <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
             <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
               <ExternalLink className="w-3 h-3" />
               <span>URLs from PR #{prForURLs?.number}</span>
             </div>
             <button
               onClick={() => {
                 setIsURLMode(false);
                 setPRForURLs(null);
                 setQuery("");
               }}
               className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
             >
               Back
             </button>
           </div>
         )}
         <div className="flex items-center px-4 border-b h-12 gap-2 border-gray-200 dark:border-gray-700">
           <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
           <input
             autoFocus
             className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
             placeholder={isURLMode ? "Search URLs…" : "Type a command or search…"}
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

                return (
                  <li
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => {
                      cmd.action();
                      toggleCommandPalette();
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer text-sm",
                      globalIdx === selectedIndex
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                       {cmd.icon && (
                         <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                           {React.createElement(cmd.icon, { className: "w-4 h-4" })}
                         </span>
                       )}
                       <div className="flex-1 min-w-0">
                         <span className="truncate block">{cmd.name}</span>
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
