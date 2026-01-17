import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { ChevronDown, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface FeedControlsProps {
  displayedRepos: string[];
  availableRepos: string[];
  onToggleRepo: (repoKey: string) => void;
}

export function FeedControls({
  displayedRepos,
  availableRepos,
  onToggleRepo,
}: FeedControlsProps) {
  const { theme } = useUIStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canAddMore = displayedRepos.length < 4;
  const availableToAdd = availableRepos.filter((r) => !displayedRepos.includes(r));

  return (
    <div className={cn(
      "border-b px-6 py-3 flex items-center justify-between",
      theme === "dark" ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
    )}>
      <div className="flex items-center gap-3 flex-wrap">
        {displayedRepos.map((repo) => (
          <div
            key={repo}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium",
              theme === "dark"
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                : "bg-blue-100 text-blue-700 border border-blue-200"
            )}
          >
            <span className="text-xs opacity-75">{repo.split('/')[0]}/</span>
            {repo.split('/')[1]}
            <button
              onClick={() => onToggleRepo(repo)}
              className="hover:opacity-70"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {canAddMore && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
            )}
          >
            <Plus size={16} />
            Add ({displayedRepos.length}/4)
            <ChevronDown size={14} />
          </button>

          {showDropdown && (
            <div
              className={cn(
                "absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto",
                theme === "dark"
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-white border border-gray-200"
              )}
            >
              {availableToAdd.length === 0 ? (
                <div className={cn(
                  "px-3 py-4 text-center text-sm",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  All repositories selected
                </div>
              ) : (
                availableToAdd.map((repo) => (
                  <button
                    key={repo}
                    onClick={() => {
                      onToggleRepo(repo);
                      setShowDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      theme === "dark"
                        ? "hover:bg-gray-600 text-gray-200"
                        : "hover:bg-gray-100"
                    )}
                  >
                    <span className="text-xs opacity-75">{repo.split('/')[0]}/</span>
                    {repo.split('/')[1]}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
