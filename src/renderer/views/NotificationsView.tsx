import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Check, CheckCheck, GitPullRequest, AlertCircle, GitCommit,
  MessageSquare, RefreshCw, Tag, GitMerge,
} from "lucide-react";
import { useNotificationStore } from "../stores/notificationStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import type { GitHubNotification } from "../services/github";

type ReadFilter = "unread" | "read" | "all";

const filterOptions: { id: ReadFilter; label: string }[] = [
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
  { id: "all", label: "All" },
];

const reasonLabels: Record<string, string> = {
  assign: "Assigned",
  author: "Author",
  comment: "Commented",
  ci_activity: "CI activity",
  invitation: "Invitation",
  manual: "Subscribed",
  mention: "Mentioned you",
  review_requested: "Review requested",
  security_alert: "Security alert",
  state_change: "State changed",
  subscribed: "Subscribed",
  team_mention: "Team mentioned",
};

const typeLabels: Record<string, string> = {
  PullRequest: "PR",
  Issue: "Issue",
  Commit: "Commit",
  Discussion: "Discussion",
  Release: "Release",
  CheckSuite: "CI",
};

function getSubjectIcon(type: string, enrichment?: GitHubNotification["enrichment"]) {
  if (type === "PullRequest") {
    if (enrichment?.prState === "merged") return GitMerge;
    return GitPullRequest;
  }
  if (type === "Issue") return AlertCircle;
  if (type === "Commit") return GitCommit;
  if (type === "Discussion") return MessageSquare;
  if (type === "Release") return Tag;
  return Bell;
}

function getSubjectIconColor(type: string, unread: boolean, theme: string, enrichment?: GitHubNotification["enrichment"]) {
  if (!unread) return theme === "dark" ? "text-gray-500" : "text-gray-400";
  if (type === "PullRequest") {
    if (enrichment?.prState === "merged") return "text-purple-500";
    if (enrichment?.prState === "closed") return "text-red-500";
    return "text-green-500";
  }
  if (type === "Issue") {
    if (enrichment?.issueState === "closed") return "text-purple-500";
    return "text-yellow-500";
  }
  return "text-blue-500";
}

function getTypeBadgeColors(type: string, theme: string) {
  const base = {
    PullRequest: theme === "dark"
      ? "bg-green-500/15 text-green-400 border-green-500/20"
      : "bg-green-50 text-green-700 border-green-200",
    Issue: theme === "dark"
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
      : "bg-yellow-50 text-yellow-700 border-yellow-200",
    Commit: theme === "dark"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
      : "bg-blue-50 text-blue-700 border-blue-200",
    Discussion: theme === "dark"
      ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
      : "bg-purple-50 text-purple-700 border-purple-200",
    Release: theme === "dark"
      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
      : "bg-cyan-50 text-cyan-700 border-cyan-200",
  };
  return (base as Record<string, string>)[type] || (theme === "dark"
    ? "bg-gray-500/15 text-gray-400 border-gray-500/20"
    : "bg-gray-100 text-gray-600 border-gray-200");
}

function extractPRNumber(apiUrl: string | null): { owner: string; repo: string; number: number } | null {
  if (!apiUrl) return null;
  const match = apiUrl.match(/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)/);
  if (match) {
    return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
  }
  const issueMatch = apiUrl.match(/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (issueMatch) {
    return { owner: issueMatch[1], repo: issueMatch[2], number: parseInt(issueMatch[3], 10) };
  }
  return null;
}

const formatDateTime = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

function NotificationRow({
  notification,
  theme,
  onNavigate,
  onMarkRead,
  isSelected,
  rowRef,
}: {
  notification: GitHubNotification;
  theme: "light" | "dark";
  onNavigate: (n: GitHubNotification) => void;
  onMarkRead: (id: string) => void;
  isSelected: boolean;
  rowRef?: React.Ref<HTMLButtonElement>;
}) {
  const enrichment = notification.enrichment;
  const Icon = getSubjectIcon(notification.subject.type, enrichment);
  const iconColor = getSubjectIconColor(notification.subject.type, notification.unread, theme, enrichment);
  const reasonLabel = reasonLabels[notification.reason] || notification.reason;
  const typeLabel = typeLabels[notification.subject.type] || notification.subject.type;
  const typeBadgeColor = getTypeBadgeColors(notification.subject.type, theme);
  const displayNumber = enrichment?.number;
  const actor = enrichment?.actor;
  const commentBody = enrichment?.commentBody;

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onNavigate(notification)}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition hover:shadow-sm group",
        isSelected
          ? theme === "dark"
            ? "bg-blue-900/40 border-blue-500 ring-1 ring-blue-500/50"
            : "bg-blue-50 border-blue-400 ring-1 ring-blue-400/50"
          : notification.unread
            ? theme === "dark"
              ? "bg-gray-800 border-gray-600 hover:border-gray-500"
              : "bg-white border-gray-300 hover:border-gray-400"
            : theme === "dark"
              ? "bg-gray-800/50 border-gray-700 hover:border-gray-600"
              : "bg-gray-50 border-gray-200 hover:border-gray-300",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Left: avatar or icon */}
        <div className="flex-shrink-0 mt-0.5">
          {actor ? (
            <img
              src={actor.avatar_url}
              alt={actor.login}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                theme === "dark" ? "bg-gray-700" : "bg-gray-100",
              )}
            >
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
          )}
        </div>

        {/* Center: content */}
        <div className="min-w-0 flex-1">
          {/* Top row: title + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {notification.unread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <span
              className={cn(
                "font-medium",
                !notification.unread && (theme === "dark" ? "text-gray-400" : "text-gray-500"),
              )}
            >
              {notification.subject.title}
            </span>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Type badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                typeBadgeColor,
              )}
            >
              <Icon className="w-3 h-3" />
              {typeLabel}
              {displayNumber !== undefined && (
                <span className="opacity-70">#{displayNumber}</span>
              )}
            </span>

            {/* PR state badge */}
            {enrichment?.prState === "merged" && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                theme === "dark"
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
                  : "bg-purple-50 text-purple-700 border-purple-200",
              )}>
                <GitMerge className="w-3 h-3" />
                Merged
              </span>
            )}
            {enrichment?.prState === "closed" && !enrichment?.prDraft && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                theme === "dark"
                  ? "bg-red-500/15 text-red-400 border-red-500/20"
                  : "bg-red-50 text-red-700 border-red-200",
              )}>
                Closed
              </span>
            )}
            {enrichment?.prDraft && enrichment?.prState === "open" && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                theme === "dark"
                  ? "bg-gray-500/15 text-gray-400 border-gray-500/20"
                  : "bg-gray-100 text-gray-600 border-gray-200",
              )}>
                Draft
              </span>
            )}
            {enrichment?.issueState === "closed" && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                theme === "dark"
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
                  : "bg-purple-50 text-purple-700 border-purple-200",
              )}>
                Closed
              </span>
            )}

            {/* Reason badge */}
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                theme === "dark"
                  ? "bg-gray-700/50 text-gray-400 border-gray-600"
                  : "bg-gray-50 text-gray-500 border-gray-200",
              )}
            >
              {reasonLabel}
            </span>
          </div>

          {/* Actor line */}
          {actor && (
            <div
              className={cn(
                "flex items-center gap-1.5 mt-1.5 text-xs",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            >
              <span className="font-medium">{actor.login}</span>
              <span>•</span>
              <span>{notification.repository.full_name}</span>
              <span>•</span>
              <span>{formatDateTime(notification.updated_at)}</span>
            </div>
          )}
          {!actor && (
            <div
              className={cn(
                "text-xs mt-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            >
              <span>{notification.repository.full_name}</span>
              <span> • </span>
              <span>{formatDateTime(notification.updated_at)}</span>
            </div>
          )}

          {/* Comment preview */}
          {commentBody && (
            <div
              className={cn(
                "mt-2 text-xs leading-relaxed line-clamp-2 rounded px-2.5 py-2 border-l-2",
                theme === "dark"
                  ? "text-gray-400 bg-gray-700/30 border-gray-600"
                  : "text-gray-500 bg-gray-50 border-gray-300",
              )}
            >
              {commentBody}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {notification.unread && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              title="Mark as read"
              className={cn(
                "p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-200 text-gray-400 hover:text-gray-700",
              )}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </button>
  );
}

export default function NotificationsView() {
  const { theme } = useUIStore();
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    enriching,
    error,
    filter,
    selectedIndex,
    fetchNotifications,
    setFilter,
    markAsRead,
    markAllAsRead,
    moveSelection,
  } = useNotificationStore();
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleNavigate = useCallback(
    (notification: GitHubNotification) => {
      if (notification.unread) {
        markAsRead(notification.id);
      }

      if (notification.subject.type === "PullRequest") {
        const info = extractPRNumber(notification.subject.url);
        if (info) {
          navigate(`/pulls/${info.owner}/${info.repo}/${info.number}`);
          return;
        }
      }

      if (notification.subject.type === "Issue") {
        const info = extractPRNumber(notification.subject.url);
        if (info) {
          navigate(`/issues/${info.owner}/${info.repo}/${info.number}`);
          return;
        }
      }
    },
    [markAsRead, navigate],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "j") {
        e.preventDefault();
        moveSelection("down");
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        moveSelection("up");
        return;
      }
      if (e.key === "e") {
        e.preventDefault();
        const n = notifications[useNotificationStore.getState().selectedIndex];
        if (n?.unread) markAsRead(n.id);
        return;
      }
      if (e.key === "Enter" || e.key === "o") {
        e.preventDefault();
        const n = notifications[useNotificationStore.getState().selectedIndex];
        if (n) handleNavigate(n);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [notifications, moveSelection, markAsRead, handleNavigate]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden flex flex-col",
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-white text-gray-900",
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" />
              Notifications
            </h1>
            <p
              className={cn(
                "mt-1 text-sm flex items-center gap-2",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              {loading
                ? "Loading notifications..."
                : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${filter === "unread" ? " unread" : ""}`}
              {enriching && (
                <span className={cn(
                  "text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-400",
                )}>
                  Loading details...
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex rounded-lg border overflow-hidden",
                theme === "dark" ? "border-gray-600" : "border-gray-300",
              )}
            >
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition",
                    filter === opt.id
                      ? theme === "dark"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white"
                      : theme === "dark"
                        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        : "bg-white text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={loading}
              title="Refresh"
              className={cn(
                "p-2 rounded-lg transition",
                theme === "dark"
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-500 hover:text-gray-700",
                loading && "animate-spin",
              )}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition",
                  theme === "dark"
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-300",
                )}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {error && (
          <div
            className={cn(
              "text-center py-8 text-sm",
              theme === "dark" ? "text-red-400" : "text-red-600",
            )}
          >
            {error}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell
              className={cn(
                "w-12 h-12 mb-4",
                theme === "dark" ? "text-gray-600" : "text-gray-300",
              )}
            />
            <p
              className={cn(
                "text-lg font-medium",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            >
              {filter === "unread" ? "All caught up" : "No notifications"}
            </p>
            <p
              className={cn(
                "text-sm mt-1",
                theme === "dark" ? "text-gray-500" : "text-gray-400",
              )}
            >
              {filter === "unread"
                ? "You have no unread notifications."
                : "Nothing to see here."}
            </p>
          </div>
        )}

        {loading && notifications.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              theme={theme}
              onNavigate={handleNavigate}
              onMarkRead={markAsRead}
              isSelected={index === selectedIndex}
              rowRef={index === selectedIndex ? selectedRowRef : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
