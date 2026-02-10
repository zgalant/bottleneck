import { cn } from "../../utils/cn";
import { useUIStore } from "../../stores/uiStore";
import type { StalenessDistribution } from "../../stores/statsStore";

interface StalenessHistogramProps {
  distribution: StalenessDistribution;
}

export function StalenessHistogram({ distribution }: StalenessHistogramProps) {
  const { theme } = useUIStore();

  const buckets = [
    { label: '4 hours', key: '4hours' as const },
    { label: '1 day', key: '1day' as const },
    { label: '2 days', key: '2days' as const },
    { label: '3 days', key: '3days' as const },
    { label: '4-10 days', key: '4to10days' as const },
    { label: '10+ days', key: '10plus' as const },
  ];

  const totalPRs = Object.values(distribution).reduce((sum, status) => {
    return sum + status.draft + status.readyForReview + status.approved;
  }, 0);

  const maxCount = Math.max(
    ...Object.values(distribution).map((status) => status.draft + status.readyForReview + status.approved),
    1
  );

  const statusColors = {
    draft: theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400',
    readyForReview: theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500',
    approved: theme === 'dark' ? 'bg-green-600' : 'bg-green-500',
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-6 text-sm mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", statusColors.draft)} />
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", statusColors.readyForReview)} />
          <span>Ready for Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", statusColors.approved)} />
          <span>Approved</span>
        </div>
      </div>

      {buckets.map(({ label, key }) => {
        const status = distribution[key];
        const total = status.draft + status.readyForReview + status.approved;
        const maxPercentage = (total / maxCount) * 100;

        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-20 text-sm font-medium">
              {label}
            </div>
            <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden flex">
              {/* Draft segment */}
              {status.draft > 0 && (
                <div
                  className={cn("h-full transition-all", statusColors.draft)}
                  style={{ width: `${(status.draft / total) * maxPercentage}%` }}
                  title={`Draft: ${status.draft}`}
                />
              )}
              {/* Ready for Review segment */}
              {status.readyForReview > 0 && (
                <div
                  className={cn("h-full transition-all", statusColors.readyForReview)}
                  style={{ width: `${(status.readyForReview / total) * maxPercentage}%` }}
                  title={`Ready for Review: ${status.readyForReview}`}
                />
              )}
              {/* Approved segment */}
              {status.approved > 0 && (
                <div
                  className={cn("h-full transition-all", statusColors.approved)}
                  style={{ width: `${(status.approved / total) * maxPercentage}%` }}
                  title={`Approved: ${status.approved}`}
                />
              )}
            </div>
            <div className={cn("text-right w-12 font-semibold", theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
              {total}
            </div>
            {totalPRs > 0 && (
              <div className={cn(
                "w-12 text-right text-xs",
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              )}>
                {((total / totalPRs) * 100).toFixed(0)}%
              </div>
            )}
          </div>
        );
      })}
      <div className={cn(
        "text-sm font-medium pt-2 mt-4 border-t",
        theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
      )}>
        Total: {totalPRs} open PRs
      </div>
    </div>
  );
}
