import { useUIStore } from "../../stores/uiStore";
import { Repository } from "../../services/github";
import { cn } from "../../utils/cn";
import { ChevronDown, Search, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

interface StatsFiltersBarProps {
  timeRange: 'week' | 'month' | 'quarter' | 'all';
  selectedRepos: string[];
  availableRepos: Repository[];
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'all') => void;
  onReposChange: (repos: string[]) => void;
}

export function StatsFiltersBar({
  timeRange,
  selectedRepos,
  availableRepos,
  onTimeRangeChange,
  onReposChange,
}: StatsFiltersBarProps) {
  const { theme } = useUIStore();
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRepoDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showRepoDropdown && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [showRepoDropdown]);

  // Filter repos based on search query
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableRepos;
    }

    const query = searchQuery.toLowerCase();
    return availableRepos.filter((repo) => {
      const fullName = `${repo.owner}/${repo.name}`.toLowerCase();
      return fullName.includes(query) || repo.name.toLowerCase().includes(query) || repo.owner.toLowerCase().includes(query);
    });
  }, [availableRepos, searchQuery]);

  const timeRanges = [
    { label: 'Last 7 days', value: 'week' as const },
    { label: 'Last 30 days', value: 'month' as const },
    { label: 'Last 90 days', value: 'quarter' as const },
    { label: 'All time', value: 'all' as const },
  ];

  const handleRepoToggle = (repoKey: string) => {
    const newSelected = selectedRepos.includes(repoKey)
      ? selectedRepos.filter(r => r !== repoKey)
      : [...selectedRepos, repoKey];
    onReposChange(newSelected);
  };

  const handleSelectAll = () => {
    const allRepos = availableRepos.map(r => `${r.owner}/${r.name}`);
    if (selectedRepos.length === allRepos.length) {
      onReposChange([]);
    } else {
      onReposChange(allRepos);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-lg",
        theme === "dark"
          ? "bg-gray-800 border border-gray-700"
          : "bg-gray-50 border border-gray-200"
      )}
    >
      {/* Time Range Selector */}
      <div className="flex gap-2">
        <span className={cn(
          "text-sm font-medium self-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}>
          Time Range:
        </span>
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onTimeRangeChange(range.value)}
            className={cn(
              "px-3 py-2 rounded text-sm font-medium transition-colors",
              timeRange === range.value
                ? theme === "dark"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-500 text-white"
                : theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Repository Selector */}
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={() => setShowRepoDropdown(!showRepoDropdown)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
            theme === "dark"
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
          )}
        >
          Repositories ({selectedRepos.length === 0 ? 'All' : selectedRepos.length})
          <ChevronDown size={16} />
        </button>

        {showRepoDropdown && (
          <div
            className={cn(
              "absolute right-0 mt-2 w-72 rounded-lg shadow-lg z-50 max-h-96 flex flex-col",
              theme === "dark"
                ? "bg-gray-700 border border-gray-600"
                : "bg-white border border-gray-200"
            )}
          >
            {/* Search input */}
            <div className="p-3 border-b sticky top-0" style={{
              borderColor: theme === "dark" ? "#525252" : "#e5e7eb"
            }}>
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded",
                theme === "dark"
                  ? "bg-gray-600 border border-gray-500"
                  : "bg-gray-50 border border-gray-300"
              )}>
                <Search size={16} className={theme === "dark" ? "text-gray-400" : "text-gray-500"} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search repos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent outline-none text-sm",
                    theme === "dark"
                      ? "text-gray-200 placeholder-gray-400"
                      : "text-gray-900 placeholder-gray-500"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={cn(
                      "p-1 rounded hover:bg-gray-400/20",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* All Repositories button */}
            <div className="p-2 border-b" style={{
              borderColor: theme === "dark" ? "#525252" : "#e5e7eb"
            }}>
              <button
                onClick={handleSelectAll}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "hover:bg-gray-600 text-gray-200"
                    : "hover:bg-gray-100"
                )}
              >
                {selectedRepos.length === availableRepos.length ? '✓ ' : ''}All Repositories
              </button>
            </div>

            {/* Filtered repos list */}
            <div className="p-2 overflow-y-auto flex-1">
              {filteredRepos.length === 0 ? (
                <div className={cn(
                  "px-3 py-4 text-center text-sm",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  No repositories found
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const repoKey = `${repo.owner}/${repo.name}`;
                  const isSelected = selectedRepos.includes(repoKey);

                  return (
                    <button
                      key={repoKey}
                      onClick={() => handleRepoToggle(repoKey)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
                        isSelected
                          ? theme === "dark"
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-900"
                          : theme === "dark"
                            ? "hover:bg-gray-600 text-gray-200"
                            : "hover:bg-gray-100"
                      )}
                    >
                      {isSelected && <span className="text-sm">✓</span>}
                      <span className="text-xs opacity-75">{repo.owner}/</span>
                      {repo.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
