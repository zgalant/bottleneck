import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { GitPullRequest, Code2, CheckCircle2, FileX } from "lucide-react";
import type { RepoStats, PersonStats, ReviewerStats } from "../../stores/statsStore";

interface StatsOverviewProps {
  stats: {
    repos: RepoStats[];
    people: PersonStats[];
    reviewers: ReviewerStats[];
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const { theme } = useUIStore();

  const totalPRs = stats.repos.reduce((sum, r) => sum + r.totalPRs, 0);
  const totalOpen = stats.repos.reduce((sum, r) => sum + r.open, 0);
  const totalMerged = stats.repos.reduce((sum, r) => sum + r.merged, 0);
  const totalDraft = stats.repos.reduce((sum, r) => sum + r.draft, 0);

  const statCards = [
    {
      label: 'Total PRs',
      value: totalPRs,
      icon: GitPullRequest,
      color: 'blue',
    },
    {
      label: 'Open PRs',
      value: totalOpen,
      icon: Code2,
      color: 'yellow',
    },
    {
      label: 'Merged',
      value: totalMerged,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'Draft',
      value: totalDraft,
      icon: FileX,
      color: 'gray',
    },
  ];

  const colorMap = {
    blue: theme === "dark"
      ? { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700' }
      : { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    yellow: theme === "dark"
      ? { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700' }
      : { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    green: theme === "dark"
      ? { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700' }
      : { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    gray: theme === "dark"
      ? { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600' }
      : { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const colors = colorMap[card.color as keyof typeof colorMap];

        return (
          <div
            key={card.label}
            className={cn(
              "p-4 rounded-lg border",
              colors.bg,
              colors.border
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  {card.label}
                </p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  colors.text
                )}>
                  {card.value}
                </p>
              </div>
              <Icon className={cn("w-8 h-8", colors.text)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
