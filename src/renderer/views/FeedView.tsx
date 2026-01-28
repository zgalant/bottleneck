import { useEffect, useMemo } from "react";
import { usePRStore } from "../stores/prStore";
import { useActivityStore } from "../stores/activityStore";
import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../utils/cn";
import { FeedColumn } from "../components/feed/FeedColumn";

export default function FeedView() {
  const { theme } = useUIStore();
  const { pullRequests, selectedRepo } = usePRStore();
  const { generateActivitiesFromPRs } = useActivityStore();
  const { user } = useAuthStore();

  // Generate activities whenever PRs change
  useEffect(() => {
    generateActivitiesFromPRs(pullRequests, user?.login);
  }, [pullRequests, generateActivitiesFromPRs, user?.login]);

  const repoKey = useMemo(() => {
    if (!selectedRepo) return null;
    return `${selectedRepo.owner}/${selectedRepo.name}`;
  }, [selectedRepo]);

  return (
    <div
      className={cn(
        "h-full overflow-hidden flex flex-col",
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
              {selectedRepo
                ? `Real-time updates for ${selectedRepo.full_name ?? `${selectedRepo.owner}/${selectedRepo.name}`}`
                : "Select a repository to view activity"}
            </p>
          </div>
        </div>
      </div>

      {/* Feed Column */}
      <div className="flex-1 min-h-0 overflow-hidden flex gap-2 p-4">
        {!repoKey ? (
          <div className="flex items-center justify-center w-full">
            <div className={cn(
              "text-center",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )}>
              <p className="text-lg font-semibold mb-2">No repository selected</p>
              <p className="text-sm">Choose a repository from the top bar to view activity</p>
            </div>
          </div>
        ) : (
          <FeedColumn repoKey={repoKey} />
        )}
      </div>
    </div>
  );
}
