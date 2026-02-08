import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, GitPullRequest, Eye, Users, Filter, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import type { PullRequest } from "../services/github";
import { cn } from "../utils/cn";
import { getPRIconProps } from "../utils/prStatus";
import { getLabelColors } from "../utils/labelColors";

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

const matchesLogin = (login: string | undefined, target: string) =>
  Boolean(login && login.toLowerCase() === target.toLowerCase());

const sortByUpdated = (a: PullRequest, b: PullRequest) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

type TabId = "opened" | "review" | "involved";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof GitPullRequest;
  emptyMessage: string;
}

const tabs: Tab[] = [
  { id: "opened", label: "Opened by you", icon: GitPullRequest, emptyMessage: "No pull requests authored yet." },
  { id: "review", label: "Needs your review", icon: Eye, emptyMessage: "No review requests right now." },
  { id: "involved", label: "You're involved", icon: Users, emptyMessage: "No other PRs with your involvement." },
];

type StatusFilter = "open" | "closed" | "merged" | "draft";

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "draft", label: "Draft" },
  { id: "closed", label: "Closed" },
  { id: "merged", label: "Merged" },
];

const getPRStatus = (pr: PullRequest): StatusFilter => {
  if (pr.merged) return "merged";
  if (pr.draft && pr.state === "open") return "draft";
  if (pr.state === "closed") return "closed";
  return "open";
};

interface PRListProps {
  prs: PullRequest[];
  theme: "light" | "dark";
  emptyMessage: string;
  onSelect: (pr: PullRequest) => void;
}

const PRList = ({ prs, theme, emptyMessage, onSelect }: PRListProps) => {
  if (prs.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center justify-center text-sm py-12",
          theme === "dark" ? "text-gray-500" : "text-gray-400",
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {prs.map((pr) => {
        const { Icon, className: iconClassName } = getPRIconProps(pr, "w-4 h-4");
        const repoName = `${pr.base.repo.owner.login}/${pr.base.repo.name}`;
        const updatedLabel = formatDateTime(pr.updated_at);
        const isDraft = pr.draft && pr.state === "open";

        return (
          <li key={getPRKey(pr)}>
            <button
              type="button"
              onClick={() => onSelect(pr)}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition hover:shadow-sm",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                  : "bg-white border-gray-200 hover:border-gray-300",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Icon className={iconClassName} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{pr.title}</span>
                      {isDraft && (
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full",
                            theme === "dark"
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-600",
                          )}
                        >
                          Draft
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-1",
                        theme === "dark" ? "text-gray-400" : "text-gray-500",
                      )}
                    >
                      {repoName} • #{pr.number} • by {pr.user.login}
                    </div>
                    
                    {/* Labels and review status row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Review status badge */}
                      {pr.state === "open" && !pr.merged && (
                        <div className="flex items-center">
                          {pr.approvalStatus === "approved" ? (
                            <div className="flex items-center px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded text-[10px] leading-tight" title="Approved">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" />
                              <span>Approved{pr.approvedBy && pr.approvedBy.length > 0 && ` (${pr.approvedBy.length})`}</span>
                            </div>
                          ) : pr.approvalStatus === "changes_requested" ? (
                            <div className="flex items-center px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded text-[10px] leading-tight" title="Changes requested">
                              <XCircle className="w-3 h-3 mr-0.5" />
                              <span>Changes requested</span>
                            </div>
                          ) : pr.approvalStatus === "pending" ? (
                            <div className="flex items-center px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[10px] leading-tight" title="Review pending">
                              <Clock className="w-3 h-3 mr-0.5" />
                              <span>Pending</span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Labels */}
                      {pr.labels && pr.labels.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {pr.labels.slice(0, 2).map((label) => {
                            const labelColors = getLabelColors(label.color, theme);
                            return (
                              <span
                                key={label.name}
                                className="px-2 py-0.5 rounded text-[10px] font-medium opacity-80"
                                style={{
                                  backgroundColor: labelColors.backgroundColor,
                                  color: labelColors.color,
                                }}
                                title={label.name}
                              >
                                {label.name.length > 15 ? `${label.name.slice(0, 15)}…` : label.name}
                              </span>
                            );
                          })}
                          {pr.labels.length > 2 && (
                            <span
                              className={cn(
                                "text-xs",
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                              )}
                            >
                              +{pr.labels.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xs whitespace-nowrap",
                    theme === "dark" ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  Updated {updatedLabel}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default function MeView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { pullRequests } = usePRStore();
  const { theme } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabId>("opened");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusFilter>>(
    new Set(["open", "draft", "closed"]) // exclude merged by default
  );

  const login = user?.login ?? "";

  const toggleStatus = (status: StatusFilter) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const {
    openedByMe,
    reviewRequested,
    involved,
  } = useMemo(() => {
    if (!login) {
      return {
        openedByMe: [],
        reviewRequested: [],
        involved: [],
      };
    }

    const allPRs = Array.from(pullRequests.values()).filter((pr) =>
      selectedStatuses.has(getPRStatus(pr))
    );
    const opened = [] as PullRequest[];
    const review = [] as PullRequest[];
    const involvedPRs = [] as PullRequest[];

    const openedKeys = new Set<string>();
    const reviewKeys = new Set<string>();

    allPRs.forEach((pr) => {
      const key = getPRKey(pr);
      const isAuthor = matchesLogin(pr.user?.login, login);
      const isRequestedReviewer = pr.requested_reviewers?.some((reviewer) =>
        matchesLogin(reviewer.login, login),
      );
      const isAssignee = pr.assignees?.some((assignee) =>
        matchesLogin(assignee.login, login),
      );
      const isReviewer =
        pr.approvedBy?.some((reviewer) =>
          matchesLogin(reviewer.login, login),
        ) ||
        pr.changesRequestedBy?.some((reviewer) =>
          matchesLogin(reviewer.login, login),
        );
      const isMentioned = pr.body
        ? new RegExp(`@${login}\\b`, "i").test(pr.body)
        : false;

      if (isAuthor) {
        opened.push(pr);
        openedKeys.add(key);
      }

      if (isRequestedReviewer) {
        review.push(pr);
        reviewKeys.add(key);
      }

      if (isAuthor || isRequestedReviewer || isAssignee || isReviewer || isMentioned) {
        if (!openedKeys.has(key) && !reviewKeys.has(key)) {
          involvedPRs.push(pr);
        }
      }
    });

    opened.sort(sortByUpdated);
    review.sort(sortByUpdated);
    involvedPRs.sort(sortByUpdated);

    return {
      openedByMe: opened,
      reviewRequested: review,
      involved: involvedPRs,
    };
  }, [login, pullRequests, selectedStatuses]);

  const handleSelectPR = (pr: PullRequest) => {
    navigate(
      `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`,
      { state: { from: location.pathname } },
    );
  };

  const getTabPRs = (tabId: TabId): PullRequest[] => {
    switch (tabId) {
      case "opened":
        return openedByMe;
      case "review":
        return reviewRequested;
      case "involved":
        return involved;
    }
  };

  const activeTabData = tabs.find((t) => t.id === activeTab)!;

  return (
    <div
      className={cn(
        "flex-1 h-full min-h-0 overflow-hidden flex flex-col",
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900",
      )}
    >
      <div
        className={cn(
          "border-b px-6 py-4",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h1 className="text-2xl font-semibold">My Stuff</h1>
            </div>
            <p
              className={cn(
                "mt-1 text-sm",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            >
              Your pull requests, review assignments, and activity in one place.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-9 h-9 rounded-full"
              />
              <div className="text-right">
                <div className="text-sm font-medium">{user.name}</div>
                <div
                  className={cn(
                    "text-xs",
                    theme === "dark" ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  @{user.login}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div
          className={cn(
            "flex items-center justify-between border-b px-6",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <div className="flex">
          {tabs.map((tab) => {
            const count = getTabPRs(tab.id).length;
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? theme === "dark"
                      ? "border-blue-500 text-blue-400"
                      : "border-blue-600 text-blue-600"
                    : theme === "dark"
                      ? "border-transparent text-gray-400 hover:text-gray-200"
                      : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    isActive
                      ? theme === "dark"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-blue-100 text-blue-600"
                      : theme === "dark"
                        ? "bg-gray-700 text-gray-400"
                        : "bg-gray-100 text-gray-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          </div>

          <div className="flex items-center gap-1">
            <Filter className={cn(
              "w-4 h-4 mr-1",
              theme === "dark" ? "text-gray-500" : "text-gray-400",
            )} />
            {statusFilters.map((filter) => {
              const isSelected = selectedStatuses.has(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleStatus(filter.id)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors",
                    isSelected
                      ? theme === "dark"
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-200 text-gray-800"
                      : theme === "dark"
                        ? "text-gray-500 hover:text-gray-300"
                        : "text-gray-400 hover:text-gray-600",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <PRList
            prs={getTabPRs(activeTab)}
            theme={theme}
            emptyMessage={activeTabData.emptyMessage}
            onSelect={handleSelectPR}
          />
        </div>
      </div>
    </div>
  );
}
