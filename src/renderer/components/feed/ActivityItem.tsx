import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { GitPullRequest, GitMerge, XCircle, MessageCircle, CheckCircle2 } from "lucide-react";
import type { Activity } from "../../stores/activityStore";

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { theme } = useUIStore();

  function formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getActivityIcon() {
    switch (activity.type) {
      case 'pr_opened':
        return <GitPullRequest size={16} className="text-blue-500" />;
      case 'pr_merged':
        return <GitMerge size={16} className="text-purple-500" />;
      case 'pr_closed':
        return <XCircle size={16} className="text-red-500" />;
      case 'review':
        return activity.reviewState === 'APPROVED'
          ? <CheckCircle2 size={16} className="text-green-500" />
          : <MessageCircle size={16} className="text-yellow-500" />;
      case 'comment':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'commit':
        return <GitPullRequest size={16} className="text-gray-500" />;
      default:
        return null;
    }
  }

  function getActivityLabel(): string {
    switch (activity.type) {
      case 'pr_opened':
        return 'Opened PR';
      case 'pr_merged':
        return 'Merged PR';
      case 'pr_closed':
        return 'Closed PR';
      case 'review':
        return activity.reviewState === 'APPROVED' ? 'Approved' : 'Requested changes';
      case 'comment':
        return 'Commented';
      case 'commit':
        return 'Committed';
      default:
        return 'Activity';
    }
  }

  function getActivityColor(): string {
    switch (activity.type) {
      case 'pr_opened':
        return theme === "dark" ? 'text-blue-400' : 'text-blue-600';
      case 'pr_merged':
        return theme === "dark" ? 'text-purple-400' : 'text-purple-600';
      case 'pr_closed':
        return theme === "dark" ? 'text-red-400' : 'text-red-600';
      case 'review':
        return activity.reviewState === 'APPROVED'
          ? (theme === "dark" ? 'text-green-400' : 'text-green-600')
          : (theme === "dark" ? 'text-yellow-400' : 'text-yellow-600');
      case 'comment':
        return theme === "dark" ? 'text-blue-400' : 'text-blue-600';
      case 'commit':
        return theme === "dark" ? 'text-gray-400' : 'text-gray-600';
      default:
        return theme === "dark" ? 'text-gray-400' : 'text-gray-600';
    }
  }

  return (
    <div className={cn(
      "px-4 py-3 hover:bg-gray-300/10 transition-colors",
      theme === "dark" ? "hover:bg-gray-700/50" : ""
    )}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getActivityIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xs font-semibold", getActivityColor())}>
              {getActivityLabel()}
            </span>
            <span className={cn(
              "text-xs",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )}>
              {formatTime(activity.timestamp)}
            </span>
          </div>

          {/* PR info */}
          {activity.prNumber && (
            <div className="mt-1 text-sm truncate">
              <span className={cn(
                "font-medium",
                theme === "dark" ? "text-gray-200" : "text-gray-900"
              )}>
                #{activity.prNumber}
              </span>
              {' '}
              <span className={cn(
                "text-xs truncate inline-block max-w-[200px]",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                {activity.prTitle}
              </span>
            </div>
          )}

          {/* User info */}
          {(activity.author || activity.reviewer || activity.commentAuthor) && (
            <div className="mt-2 flex items-center gap-2">
              {(activity.author || activity.reviewer || activity.commentAuthor) && (
                <>
                  <img
                    src={(activity.author || activity.reviewer || activity.commentAuthor)?.avatar_url}
                    alt="user"
                    className="w-5 h-5 rounded-full"
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    {(activity.author || activity.reviewer || activity.commentAuthor)?.login}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Comment preview */}
          {activity.commentBody && (
            <div className={cn(
              "mt-2 text-xs truncate",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}>
              "{activity.commentBody}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
