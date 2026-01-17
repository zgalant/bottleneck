import { useEffect, useMemo, useState } from "react";
import { usePRStore } from "../stores/prStore";
import { useActivityStore } from "../stores/activityStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { FeedColumn } from "../components/feed/FeedColumn";
import { FeedControls } from "../components/feed/FeedControls";

export default function FeedView() {
  const { theme } = useUIStore();
  const { pullRequests, repositories } = usePRStore();
  const { 
    generateActivitiesFromPRs, 
    selectedRepos, 
    setSelectedRepos,
    autoUpdate
  } = useActivityStore();

  const [displayedRepos, setDisplayedRepos] = useState<string[]>([]);

  // Generate activities whenever PRs change
  useEffect(() => {
    generateActivitiesFromPRs(pullRequests);
  }, [pullRequests, generateActivitiesFromPRs]);

  // Initialize with first repo if none selected
  useEffect(() => {
    if (displayedRepos.length === 0 && repositories.length > 0) {
      const firstRepo = `${repositories[0].owner}/${repositories[0].name}`;
      setDisplayedRepos([firstRepo]);
    }
  }, [repositories, displayedRepos.length]);

  // Handle repo selection
  const handleToggleRepo = (repoKey: string) => {
    setDisplayedRepos((prev) => {
      if (prev.includes(repoKey)) {
        return prev.filter((r) => r !== repoKey);
      } else if (prev.length < 4) {
        return [...prev, repoKey];
      }
      return prev;
    });
  };

  const availableReposForSelection = useMemo(() => {
    return repositories
      .map((r) => `${r.owner}/${r.name}`)
      .sort((a, b) => a.localeCompare(b));
  }, [repositories]);

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden flex flex-col",
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-white text-gray-900"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b px-6 py-4",
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Feed</h1>
            <p className={cn(
              "mt-1 text-sm",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}>
              Real-time updates from your repositories
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <FeedControls
        displayedRepos={displayedRepos}
        availableRepos={availableReposForSelection}
        onToggleRepo={handleToggleRepo}
      />

      {/* Feed Columns */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {displayedRepos.length === 0 ? (
          <div className="flex items-center justify-center w-full">
            <div className={cn(
              "text-center",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )}>
              <p className="text-lg font-semibold mb-2">No repositories selected</p>
              <p className="text-sm">Select up to 4 repositories to view their activity</p>
            </div>
          </div>
        ) : (
          displayedRepos.map((repoKey) => (
            <FeedColumn
              key={repoKey}
              repoKey={repoKey}
              onRemove={() => handleToggleRepo(repoKey)}
            />
          ))
        )}
      </div>
    </div>
  );
}
