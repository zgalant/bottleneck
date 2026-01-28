import { useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, GitPullRequest } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { useFollowedUsersStore } from "../stores/followedUsersStore";
import type { PullRequest } from "../services/github";
import { cn } from "../utils/cn";
import { getPRIconProps } from "../utils/prStatus";

const formatDateTime = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }

  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });

  return `${dateStr} at ${timeStr}`;
};

const getPRKey = (pr: PullRequest) =>
  `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;

const sortByUpdated = (a: PullRequest, b: PullRequest) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

export default function FollowingView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pullRequests, selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const { getFollowedUsers } = useFollowedUsersStore();

  const owner = selectedRepo?.owner;
  const repo = selectedRepo?.name;

  const followedUsers = useMemo(() => {
    if (!owner || !repo) return [];
    return getFollowedUsers(owner, repo);
  }, [owner, repo, getFollowedUsers]);

  const followedLogins = useMemo(() => {
    return new Set(followedUsers.map((u) => u.login.toLowerCase()));
  }, [followedUsers]);

  const followedPRs = useMemo(() => {
    if (followedLogins.size === 0) return [];

    const allPRs = Array.from(pullRequests.values());
    const filtered = allPRs.filter((pr) => {
      const authorLogin = pr.user?.login?.toLowerCase();
      return authorLogin && followedLogins.has(authorLogin);
    });

    return filtered.sort(sortByUpdated);
  }, [pullRequests, followedLogins]);

  const handlePRClick = useCallback(
    (pr: PullRequest) => {
      navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`, {
        state: { from: location.pathname }
      });
    },
    [navigate, location.pathname]
  );

  const handleGoToSettings = useCallback(() => {
    navigate("/settings", { state: { openTab: "following" } });
  }, [navigate]);

  if (followedUsers.length === 0) {
    return (
      <div className={cn("flex-1 flex flex-col h-full", theme === "dark" ? "bg-gray-900" : "bg-white")}>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Users
              className={cn(
                "w-12 h-12 mx-auto mb-4 opacity-50",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}
            />
            <p
              className={cn(
                "text-lg font-medium",
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              )}
            >
              Not following anyone yet
            </p>
            <p
              className={cn(
                "text-sm mt-2 mb-4",
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              )}
            >
              Follow people in Settings → Following to see their activity here
            </p>
            <button
              onClick={handleGoToSettings}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col h-full", theme === "dark" ? "bg-gray-900" : "bg-white")}>
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          theme === "dark" ? "border-gray-800" : "border-gray-200"
        )}
      >
        <div className="flex items-center gap-2">
          <Users className={cn("w-5 h-5", theme === "dark" ? "text-blue-400" : "text-blue-500")} />
          <h1 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>
            Following
          </h1>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            )}
          >
            {followedPRs.length}
          </span>
        </div>
        <button
          onClick={handleGoToSettings}
          className={cn(
            "text-sm px-3 py-1 rounded transition-colors",
            theme === "dark"
              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          Manage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {followedPRs.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center h-full",
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            )}
          >
            <div className="text-center">
              <GitPullRequest className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No pull requests from followed users</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {followedPRs.map((pr) => {
              const { Icon, className: iconClassName } = getPRIconProps(pr, "w-4 h-4");
              const repoName = `${pr.base.repo.owner.login}/${pr.base.repo.name}`;
              const updatedLabel = formatDateTime(pr.updated_at);
              const isDraft = pr.draft && pr.state === "open";

              return (
                <li key={getPRKey(pr)}>
                  <button
                    type="button"
                    onClick={() => handlePRClick(pr)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition hover:bg-opacity-50",
                      theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                          className="w-8 h-8 rounded-full mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Icon className={iconClassName} />
                            <span
                              className={cn(
                                "font-medium",
                                theme === "dark" ? "text-white" : "text-gray-900"
                              )}
                            >
                              {pr.title}
                            </span>
                            {isDraft && (
                              <span
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full",
                                  theme === "dark"
                                    ? "bg-gray-700 text-gray-300"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                Draft
                              </span>
                            )}
                          </div>
                          <div
                            className={cn(
                              "text-xs mt-1",
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            {repoName} • #{pr.number} • by {pr.user.login}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-xs whitespace-nowrap",
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        {updatedLabel}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
