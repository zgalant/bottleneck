import { Bug } from "lucide-react";
import { cn } from "../../utils/cn";
import { PullRequest } from "../../services/github";
import { extractSentryIssues, SentryIssueRef } from "../../utils/sentryLinks";
import { useSentryIssueStore } from "../../stores/sentryIssueStore";
import { SentryIcon } from "../icons/SentryIcon";

interface SentryIssuesProps {
  pr: PullRequest;
  theme: "light" | "dark";
}

// Get status color for Sentry issue
function getStatusColor(status: string, theme: "light" | "dark") {
  switch (status) {
    case "resolved":
      return theme === "dark"
        ? "bg-green-500/20 text-green-400"
        : "bg-green-100 text-green-700";
    case "ignored":
    case "muted":
      return theme === "dark"
        ? "bg-gray-500/20 text-gray-400"
        : "bg-gray-100 text-gray-600";
    case "unresolved":
    default:
      return theme === "dark"
        ? "bg-rose-500/20 text-rose-400"
        : "bg-rose-100 text-rose-700";
  }
}

// Get level color for Sentry issue
function getLevelColor(level: string, theme: "light" | "dark") {
  switch (level) {
    case "fatal":
      return theme === "dark"
        ? "bg-red-600/20 text-red-400"
        : "bg-red-100 text-red-700";
    case "error":
      return theme === "dark"
        ? "bg-rose-500/20 text-rose-400"
        : "bg-rose-100 text-rose-700";
    case "warning":
      return theme === "dark"
        ? "bg-amber-500/20 text-amber-400"
        : "bg-amber-100 text-amber-700";
    case "info":
      return theme === "dark"
        ? "bg-blue-500/20 text-blue-400"
        : "bg-blue-100 text-blue-700";
    case "debug":
    default:
      return theme === "dark"
        ? "bg-gray-500/20 text-gray-400"
        : "bg-gray-100 text-gray-600";
  }
}

export function SentryIssues({ pr, theme }: SentryIssuesProps) {
  const { getIssueByIdentifier } = useSentryIssueStore();
  
  // Extract Sentry issue references from PR body and title
  const allText = [pr.body, pr.title].filter(Boolean).join("\n");
  const sentryRefs = extractSentryIssues(allText);

  if (sentryRefs.length === 0) {
    return null;
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-start space-x-3">
        <Bug
          className={cn(
            "w-5 h-5 mt-0.5",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
        />
        <div className="flex-1">
          <h3
            className={cn(
              "text-sm font-medium mb-2",
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            )}
          >
            Sentry Issues
          </h3>
          <div className="space-y-2">
            {sentryRefs.map((ref) => {
              const issue = getIssueByIdentifier(ref.id);
              
              return (
                <a
                  key={ref.id}
                  href={issue?.permalink || ref.url || `https://sentry.io/issues/${ref.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-800/50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <SentryIcon
                    className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      theme === "dark" ? "text-rose-400" : "text-rose-600"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        )}
                      >
                        {issue?.shortId || ref.id}
                      </span>
                      {issue?.status && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            getStatusColor(issue.status, theme)
                          )}
                        >
                          {issue.status}
                        </span>
                      )}
                      {issue?.level && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            getLevelColor(issue.level, theme)
                          )}
                        >
                          {issue.level}
                        </span>
                      )}
                    </div>
                    {issue?.title && (
                      <p
                        className={cn(
                          "text-sm mt-0.5 truncate",
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {issue.title}
                      </p>
                    )}
                    {issue?.tags && issue.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {issue.tags
                          .filter((tag) =>
                            ["environment", "release", "browser", "os"].includes(tag.key)
                          )
                          .slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag.key}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-xs",
                                theme === "dark"
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-600"
                              )}
                              title={`${tag.key}: ${tag.value}`}
                            >
                              {tag.key}: {tag.value}
                            </span>
                          ))}
                      </div>
                    )}
                    {issue?.count !== undefined && (
                      <p
                        className={cn(
                          "text-xs mt-1",
                          theme === "dark" ? "text-gray-500" : "text-gray-500"
                        )}
                      >
                        {issue.count.toLocaleString()} events
                        {issue.userCount !== undefined && ` • ${issue.userCount.toLocaleString()} users`}
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
