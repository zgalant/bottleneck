import { useUIStore } from "../../stores/uiStore";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";
import { GitPullRequest, GitMerge, XCircle, MessageCircle, CheckCircle2 } from "lucide-react";
import { extractLinearIssues } from "../../utils/linearLinks";
import { LinearIcon } from "../icons/LinearIcon";
import type { Activity } from "../../stores/activityStore";

interface ActivityItemProps {
  activity: Activity;
}

function canNavigateToPR(activity: Activity): boolean {
  return activity.prNumber !== undefined;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { theme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (canNavigateToPR(activity)) {
      navigate(`/pulls/${activity.repoOwner}/${activity.repo}/${activity.prNumber}`, {
        state: { activeTab: "conversation", from: location.pathname }
      });
    }
  };

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
      case 'pr_comment':
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
      case 'pr_comment':
        if (activity.isCommentMention) {
          return 'Mentioned in comments';
        } else if (activity.isAssignedPR) {
          return 'Comments on assigned PR';
        }
        return 'Comments';
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
      case 'pr_comment':
        return theme === "dark" ? 'text-blue-400' : 'text-blue-600';
      case 'commit':
        return theme === "dark" ? 'text-gray-400' : 'text-gray-600';
      default:
        return theme === "dark" ? 'text-gray-400' : 'text-gray-600';
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-3 py-2.5 transition-colors",
        canNavigateToPR(activity)
          ? "cursor-pointer hover:bg-gray-300/10"
          : "cursor-default hover:bg-gray-300/10",
        theme === "dark" ? "hover:bg-gray-700/50" : ""
      )}
    >
      <div className="flex gap-2.5">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getActivityIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold whitespace-nowrap", getActivityColor())}>
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
            <div className="mt-1.5 text-sm">
              <span className={cn(
                "font-medium",
                theme === "dark" ? "text-gray-200" : "text-gray-900"
              )}>
                #{activity.prNumber}
              </span>
              {' '}
              <span className={cn(
                "break-words",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                {activity.prTitle}
              </span>
            </div>
          )}

          {/* Linear issues */}
          {(() => {
            const linearIssues = extractLinearIssues(activity.prBody);
            if (linearIssues.length === 0) return null;
            return (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {linearIssues.slice(0, 2).map((issue) => (
                  <a
                    key={issue.id}
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors",
                      theme === "dark"
                        ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    )}
                    title={`Open ${issue.id} in Linear`}
                  >
                    <LinearIcon className="w-3 h-3" />
                    <span>{issue.id}</span>
                  </a>
                ))}
                {linearIssues.length > 2 && (
                  <span
                    className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    +{linearIssues.length - 2}
                  </span>
                )}
              </div>
            );
          })()}

          {/* User info */}
          {(activity.author || activity.reviewer || activity.commentAuthor) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {(activity.author || activity.reviewer || activity.commentAuthor) && (
                <>
                  <img
                    src={(activity.author || activity.reviewer || activity.commentAuthor)?.avatar_url}
                    alt="user"
                    className="w-4 h-4 rounded-full flex-shrink-0"
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
               "mt-2 text-xs p-2.5 rounded border",
               theme === "dark" 
                 ? "bg-gray-800/50 border-gray-700 text-gray-300" 
                 : "bg-gray-50 border-gray-200 text-gray-700"
             )}>
               <div className="line-clamp-4 whitespace-pre-wrap break-words">
                 {activity.commentBody}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
