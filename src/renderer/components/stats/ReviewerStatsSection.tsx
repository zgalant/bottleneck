import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import type { ReviewerStats } from "../../stores/statsStore";

interface ReviewerStatsSectionProps {
  reviewers: ReviewerStats[];
}

export function ReviewerStatsSection({ reviewers }: ReviewerStatsSectionProps) {
  const { theme } = useUIStore();

  const sorted = [...reviewers]
    .filter(r => r.pendingReviews + r.approved + r.changesRequested > 0)
    .sort((a, b) => b.pendingReviews - a.pendingReviews);

  if (sorted.length === 0) {
    return (
      <div className={cn(
        "p-6 rounded-lg border",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-gray-50 border-gray-200"
      )}>
        <p className={cn(
          "text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}>
          No reviewer data available
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-6 rounded-lg border",
      theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}>
      <h2 className="text-xl font-bold mb-4">Reviewer Activity</h2>

      <div className="space-y-4">
        {sorted.map((reviewer) => (
          <div
            key={reviewer.name}
            className={cn(
              "p-4 rounded border",
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              {reviewer.avatarUrl && (
                <img
                  src={reviewer.avatarUrl}
                  alt={reviewer.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <h3 className="font-semibold flex-1">{reviewer.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <StatBadge
                label="Pending Reviews"
                value={reviewer.pendingReviews}
                color="blue"
                theme={theme}
              />
              <StatBadge
                label="Approved"
                value={reviewer.approved}
                color="green"
                theme={theme}
              />
              <StatBadge
                label="Changes Requested"
                value={reviewer.changesRequested}
                color="red"
                theme={theme}
              />
              <StatBadge
                label="Dismissed"
                value={reviewer.dismissed}
                color="gray"
                theme={theme}
              />
            </div>

            {/* Activity indicator */}
            <div className="mt-3 flex gap-1">
              {[...Array(10)].map((_, i) => {
                const total = reviewer.pendingReviews + reviewer.approved + reviewer.changesRequested;
                const isActive = i < Math.ceil((reviewer.pendingReviews / Math.max(total, 1)) * 10);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-1 rounded-full transition-colors",
                      isActive
                        ? "bg-blue-500"
                        : theme === "dark"
                          ? "bg-gray-600"
                          : "bg-gray-300"
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: number;
  color: string;
  theme: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: theme === "dark"
      ? { bg: "bg-blue-900/50", text: "text-blue-300" }
      : { bg: "bg-blue-100", text: "text-blue-700" },
    green: theme === "dark"
      ? { bg: "bg-green-900/50", text: "text-green-300" }
      : { bg: "bg-green-100", text: "text-green-700" },
    red: theme === "dark"
      ? { bg: "bg-red-900/50", text: "text-red-300" }
      : { bg: "bg-red-100", text: "text-red-700" },
    gray: theme === "dark"
      ? { bg: "bg-gray-600/50", text: "text-gray-300" }
      : { bg: "bg-gray-200", text: "text-gray-700" },
  };

  const colors = colorMap[color];

  return (
    <div className={cn("p-2 rounded text-center", colors.bg)}>
      <p className={cn("text-xs opacity-75", colors.text)}>{label}</p>
      <p className={cn("text-base font-bold", colors.text)}>{value}</p>
    </div>
  );
}
