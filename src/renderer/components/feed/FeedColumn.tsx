import { useActivityStore } from "../../stores/activityStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";
import { useMemo } from "react";
import { ActivityItem } from "./ActivityItem";

interface FeedColumnProps {
  repoKey: string;
  onRemove: () => void;
}

export function FeedColumn({ repoKey, onRemove }: FeedColumnProps) {
  const { theme } = useUIStore();
  const { getActivitiesByRepo } = useActivityStore();

  const activities = useMemo(() => {
    return getActivitiesByRepo(repoKey);
  }, [repoKey, getActivitiesByRepo]);

  const [owner, name] = repoKey.split('/');

  return (
    <div className={cn(
      "flex-1 min-w-0 rounded-lg border flex flex-col",
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
        <button
          onClick={onRemove}
          className={cn(
            "p-1 rounded hover:bg-gray-300/20",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
        >
          <X size={16} />
        </button>
      </div>

      {/* Activities list */}
      <div className="flex-1 overflow-y-auto">
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
