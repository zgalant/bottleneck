import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import type { RepoStats } from "../../stores/statsStore";

interface RepoStatsSectionProps {
  repos: RepoStats[];
}

export function RepoStatsSection({ repos }: RepoStatsSectionProps) {
  const { theme } = useUIStore();

  if (repos.length === 0) {
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
          No repository data available
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
      <h2 className="text-xl font-bold mb-4">Repository Stats</h2>

      <div className="space-y-4">
        {repos.map((repo) => (
          <div
            key={`${repo.owner}/${repo.repo}`}
            className={cn(
              "p-4 rounded border",
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                <span className={cn(
                  "text-sm",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  {repo.owner}/
                </span>
                {repo.repo}
              </h3>
              <span className={cn(
                "text-sm font-semibold px-2 py-1 rounded",
                theme === "dark"
                  ? "bg-gray-600 text-gray-200"
                  : "bg-gray-200 text-gray-700"
              )}>
                {repo.totalPRs} total
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <StatBadge label="Open" value={repo.open} color="yellow" theme={theme} />
              <StatBadge label="Draft" value={repo.draft} color="gray" theme={theme} />
              <StatBadge label="In Review" value={repo.inReview} color="blue" theme={theme} />
              <StatBadge label="Approved" value={repo.approved} color="green" theme={theme} />
              <StatBadge label="Merged" value={repo.merged} color="purple" theme={theme} />
              <StatBadge label="Closed" value={repo.closed} color="red" theme={theme} />
            </div>

            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <div className="h-2 bg-gray-400 rounded-full overflow-hidden flex">
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(repo.open / repo.totalPRs) * 100}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${(repo.inReview / repo.totalPRs) * 100}%` }}
                />
                <div
                  className="bg-green-500"
                  style={{ width: `${(repo.approved / repo.totalPRs) * 100}%` }}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${(repo.merged / repo.totalPRs) * 100}%` }}
                />
              </div>
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
    yellow: theme === "dark"
      ? { bg: "bg-yellow-900/50", text: "text-yellow-300" }
      : { bg: "bg-yellow-100", text: "text-yellow-700" },
    green: theme === "dark"
      ? { bg: "bg-green-900/50", text: "text-green-300" }
      : { bg: "bg-green-100", text: "text-green-700" },
    red: theme === "dark"
      ? { bg: "bg-red-900/50", text: "text-red-300" }
      : { bg: "bg-red-100", text: "text-red-700" },
    purple: theme === "dark"
      ? { bg: "bg-purple-900/50", text: "text-purple-300" }
      : { bg: "bg-purple-100", text: "text-purple-700" },
    gray: theme === "dark"
      ? { bg: "bg-gray-600/50", text: "text-gray-300" }
      : { bg: "bg-gray-200", text: "text-gray-700" },
  };

  const colors = colorMap[color];

  return (
    <div className={cn("p-2 rounded text-center", colors.bg)}>
      <p className={cn("text-xs opacity-75", colors.text)}>{label}</p>
      <p className={cn("text-lg font-bold", colors.text)}>{value}</p>
    </div>
  );
}
