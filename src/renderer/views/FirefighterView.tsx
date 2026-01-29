import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GitPullRequest, Flame, ExternalLink, GitMerge } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../utils/cn";
import { extractLinearIdsFromPR } from "../utils/linearLinks";
import { getLabelColors } from "../utils/labelColors";
import type { PullRequest } from "../services/github";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function FirefighterView() {
  const navigate = useNavigate();
  const { pullRequests, selectedRepo, fetchPullRequests, loading } = usePRStore();
  const { theme } = useUIStore();
  const { token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (selectedRepo && token) {
      fetchPullRequests(selectedRepo.owner, selectedRepo.name).catch(console.error);
    }
  }, [selectedRepo, token, fetchPullRequests]);

  const firefighterPRs = useMemo(() => {
    const oneWeekAgo = Date.now() - ONE_WEEK_MS;

    return Array.from(pullRequests.values())
      .filter((pr) => {
        const createdAt = new Date(pr.created_at).getTime();
        if (createdAt < oneWeekAgo) return false;

        const linearIds = extractLinearIdsFromPR(pr);
        const hasFFTicket = linearIds.some((id) => id.startsWith("FF-") || id.startsWith("FF"));
        return hasFFTicket;
      })
      .filter((pr) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          pr.title.toLowerCase().includes(query) ||
          pr.number.toString().includes(query) ||
          pr.user.login.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [pullRequests, searchQuery]);

  const openPRs = useMemo(() => firefighterPRs.filter((pr) => pr.state === "open"), [firefighterPRs]);
  const mergedPRs = useMemo(() => firefighterPRs.filter((pr) => pr.merged_at), [firefighterPRs]);
  const closedPRs = useMemo(() => firefighterPRs.filter((pr) => pr.state === "closed" && !pr.merged_at), [firefighterPRs]);

  const handlePRClick = (pr: PullRequest) => {
    navigate(
      `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`
    );
  };

  const handleOpenAllInBrowser = useCallback(() => {
    firefighterPRs.forEach((pr) => {
      window.open(pr.html_url, "_blank");
    });
  }, [firefighterPRs]);

  const formatRelativeTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderPRList = (prs: PullRequest[], emptyMessage: string) => {
    if (prs.length === 0) {
      return (
        <div className={cn("px-6 py-4 text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="divide-y" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
        {prs.map((pr) => {
          const linearIds = extractLinearIdsFromPR(pr);
          const ffTickets = linearIds.filter((id) => id.startsWith("FF-") || id.startsWith("FF"));
          const isMerged = !!pr.merged_at;

          return (
            <div
              key={`${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`}
              onClick={() => handlePRClick(pr)}
              className={cn(
                "px-6 py-3 cursor-pointer transition",
                theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isMerged ? (
                      <GitMerge className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    ) : (
                      <GitPullRequest className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    <span className="font-medium truncate">{pr.title}</span>
                  </div>
                  <div
                    className="flex items-center gap-2 text-xs"
                    style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}
                  >
                    <span>{pr.base.repo.owner.login}/{pr.base.repo.name}</span>
                    <span>#{pr.number}</span>
                    <span>by {pr.user.login}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {ffTickets.map((ticket) => (
                    <span
                      key={ticket}
                      className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-orange-100 text-orange-700"
                    >
                      {ticket}
                    </span>
                  ))}
                  {Array.isArray(pr.labels) && pr.labels.slice(0, 3).map((label: { name: string; color: string }) => {
                    const labelColors = getLabelColors(label.color, theme);
                    return (
                      <span
                        key={label.name}
                        className="inline-block px-2 py-1 text-xs font-medium rounded-md"
                        style={{
                          backgroundColor: labelColors.backgroundColor,
                          color: labelColors.color,
                        }}
                      >
                        {label.name}
                      </span>
                    );
                  })}
                  {Array.isArray(pr.labels) && pr.labels.length > 3 && (
                    <span
                      className="text-xs"
                      style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}
                    >
                      +{pr.labels.length - 3}
                    </span>
                  )}
                  <span
                    className="text-xs"
                    style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}
                  >
                    {formatRelativeTime(pr.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b px-6 py-4",
          theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h1 className="text-lg font-semibold">Firefighter</h1>
          </div>
          {firefighterPRs.length > 0 && (
            <button
              onClick={handleOpenAllInBrowser}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition",
                theme === "dark"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              )}
            >
              <ExternalLink className="w-4 h-4" />
              Open All
            </button>
          )}
        </div>
        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          PRs from the last week with FF-* Linear tickets
        </p>
      </div>

      {/* Search */}
      <div
        className="px-6 py-3 border-b"
        style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}
      >
        <input
          type="text"
          placeholder="Search by title, PR #, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded border text-sm",
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500"
          )}
        />
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-2"></div>
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>Loading PRs...</p>
            </div>
          </div>
        ) : firefighterPRs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Flame className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                {searchQuery ? "No PRs match your search" : "No firefighter PRs this week"}
              </p>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                {searchQuery ? "Try a different search" : "PRs with FF-* Linear tickets will appear here"}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Open PRs Section */}
            {openPRs.length > 0 && (
              <div>
                <div
                  className={cn(
                    "px-6 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0",
                    theme === "dark" ? "bg-gray-800 text-green-400" : "bg-gray-100 text-green-700"
                  )}
                >
                  Open ({openPRs.length})
                </div>
                {renderPRList(openPRs, "")}
              </div>
            )}

            {/* Merged PRs Section */}
            {mergedPRs.length > 0 && (
              <div>
                <div
                  className={cn(
                    "px-6 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0",
                    theme === "dark" ? "bg-gray-800 text-purple-400" : "bg-gray-100 text-purple-700"
                  )}
                >
                  Merged ({mergedPRs.length})
                </div>
                {renderPRList(mergedPRs, "")}
              </div>
            )}

            {/* Closed (not merged) PRs Section */}
            {closedPRs.length > 0 && (
              <div>
                <div
                  className={cn(
                    "px-6 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0",
                    theme === "dark" ? "bg-gray-800 text-red-400" : "bg-gray-100 text-red-700"
                  )}
                >
                  Closed ({closedPRs.length})
                </div>
                {renderPRList(closedPRs, "")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
