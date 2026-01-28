import React, { useEffect, useMemo, useState } from "react";
import { Search, X, GitPullRequest, GitPullRequestDraft } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { useNavigate, useLocation } from "react-router-dom";
import { usePRStore } from "../stores/prStore";
import { getPRColorClass } from "../utils/prStatus";

interface PRItem {
  id: string;
  name: string;
  keywords: string;
  pr: any;
  action: () => void;
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

export default function PRPalette() {
  const { prPaletteOpen, togglePRPalette } = useUIStore();
  const { pullRequests } = usePRStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const prItems = useMemo(() => {
    return Array.from(pullRequests.values())
      .filter((pr) => pr.state === "open")
      .map((pr) => ({
        id: `pr-${pr.id}`,
        name: `#${pr.number} ${pr.title}`,
        keywords: `${pr.number} ${pr.title} ${pr.user.login} ${pr.base.repo.owner.login} ${pr.base.repo.name}`,
        pr,
        action: () => {
          navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`, {
            state: { activeTab: "conversation", from: location.pathname }
          });
        },
      })) as PRItem[];
  }, [pullRequests, navigate, location.pathname]);

  const filtered = useMemo(() => {
    if (!query.trim()) return prItems;
    const q = query.toLowerCase();
    return prItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
    );
  }, [query, prItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!prPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [prPaletteOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!prPaletteOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        togglePRPalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.action();
        togglePRPalette();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [prPaletteOpen, filtered, selectedIndex, togglePRPalette]);

  if (!prPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-12">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={togglePRPalette}
      />
      <div className="relative w-full max-w-3xl mx-4 h-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex items-center px-4 border-b h-12 gap-2 border-gray-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Search pull requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={togglePRPalette} className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No pull requests found</li>
          )}
          <li className={cn(
            "px-4 py-1.5 text-xs font-semibold uppercase tracking-wide",
            "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50"
          )}>
            Pull Requests
          </li>
          {filtered.map((item, idx) => {
            const { pr } = item;
            return (
              <li
                key={item.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  item.action();
                  togglePRPalette();
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 cursor-pointer text-sm",
                  idx === selectedIndex
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
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
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{item.name}</span>
                    <span className={cn(
                      "text-xs truncate block",
                      idx === selectedIndex
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-gray-500 dark:text-gray-500"
                    )}>
                      {formatRelativeTime(pr.updated_at)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
