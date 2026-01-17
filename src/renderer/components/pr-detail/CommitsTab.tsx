import React from "react";
import { cn } from "../../utils/cn";
import { Commit } from "../../services/github";
import { formatDistanceToNow } from "date-fns";

interface CommitsTabProps {
  commits: Commit[];
  theme: "dark" | "light";
}

export function CommitsTab({ commits, theme }: CommitsTabProps) {
  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          No commits found
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-y-auto h-full w-full",
        theme === "dark" ? "bg-gray-800" : "bg-gray-50",
      )}
    >
      <div className="w-full divide-y" style={{
        borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      }}>
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className={cn(
              "px-6 py-5 hover:bg-opacity-50 transition-colors cursor-pointer",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
            )}
          >
            <div className="flex items-start gap-4">
              {commit.author.avatar_url && (
                <img
                  src={commit.author.avatar_url}
                  alt={commit.author.login}
                  className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className={cn(
                    "font-mono text-sm flex-shrink-0 font-semibold",
                    theme === "dark" ? "text-gray-300" : "text-gray-700",
                  )}>
                    {commit.sha.substring(0, 7)}
                  </span>
                  <span className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}>
                    by {commit.author.login}
                  </span>
                </div>
                <div className={cn(
                  "text-base mt-2 break-words font-medium",
                  theme === "dark" ? "text-gray-100" : "text-gray-900",
                )}>
                  {commit.message.split("\n")[0]}
                </div>
                {commit.message.split("\n").length > 1 && (
                  <div className={cn(
                    "text-sm mt-3 whitespace-pre-wrap break-words",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}>
                    {commit.message.split("\n").slice(1).join("\n")}
                  </div>
                )}
                <div className={cn(
                  "text-xs mt-3",
                  theme === "dark" ? "text-gray-500" : "text-gray-500",
                )}>
                  {formatDistanceToNow(new Date(commit.committed_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
