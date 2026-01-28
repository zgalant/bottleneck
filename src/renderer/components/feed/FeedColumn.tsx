import { useActivityStore } from "../../stores/activityStore";
import { usePRStore } from "../../stores/prStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { X, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityItem } from "./ActivityItem";

interface FeedColumnProps {
  repoKey: string;
  onRemove?: () => void;
}

export function FeedColumn({ repoKey, onRemove }: FeedColumnProps) {
  const { theme } = useUIStore();
  const { activities: allActivities } = useActivityStore();
  const { fetchPullRequests } = usePRStore();
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = async () => {
    const [owner, name] = repoKey.split('/');
    setIsReloading(true);
    try {
      await fetchPullRequests(owner, name, true);
    } finally {
      setIsReloading(false);
    }
  };

  const activities = useMemo(() => {
    const [owner, name] = repoKey.split('/');
    return allActivities
      .filter((a) => a.repoOwner === owner && a.repo === name)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [repoKey, allActivities]);

  const [owner, name] = repoKey.split('/');

  return (
    <div className={cn(
      "h-full min-w-0 rounded-lg border flex flex-col",
      theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}>
      {/* Column header */}
      <div className={cn(
        "border-b px-4 py-3 flex items-center justify-between",
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      )}>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className={cn(
            "text-xs opacity-70",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            {owner}/
          </span>
          {name}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            disabled={isReloading}
            className={cn(
              "p-1.5 rounded transition-colors",
              isReloading && "opacity-50 cursor-wait",
              theme === "dark"
                ? "text-gray-400 hover:bg-gray-700 hover:text-gray-300 disabled:text-gray-500"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-700 disabled:text-gray-400"
            )}
            title="Reload repository data from GitHub"
          >
            <RefreshCw size={16} className={isReloading ? "animate-spin" : ""} />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className={cn(
                "p-1.5 rounded hover:bg-gray-300/20 transition-colors",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Activities list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activities.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center h-32 text-sm",
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          )}>
            No activity yet
          </div>
        ) : (
          <div className="divide-y" style={{
            borderColor: theme === "dark" ? "#374151" : "#e5e7eb"
          }}>
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
