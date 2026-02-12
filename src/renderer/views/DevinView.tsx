import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  RefreshCw,
  MessageSquare,
  GitPullRequest,
  ArrowRight,
  AlertCircle,
  Inbox,
  Terminal,
  Check,
  Copy,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { useDevinStore, DevinComment } from "../stores/devinStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";
import { AgentPromptBlock } from "../components/AgentPromptBlock";
import { Markdown } from "../components/Markdown";
import { parseAgentPrompt } from "../components/AgentPromptBlock";
import { DevinIcon } from "../components/icons/DevinIcon";

function DevinCommentCard({
  item,
  theme,
  onNavigate,
}: {
  item: DevinComment;
  theme: "light" | "dark";
  onNavigate: (owner: string, repo: string, prNumber: number) => void;
}) {
  const isDark = theme === "dark";
  const [copiedCheckout, setCopiedCheckout] = useState(false);
  const { beforeContent, prompt } = parseAgentPrompt(item.comment.body);

  const checkoutCommand = `gh pr checkout ${item.pr.number} --repo ${item.pr.owner}/${item.pr.repo}`;

  const handleCopyCheckout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(checkoutCommand);
      setCopiedCheckout(true);
      setTimeout(() => setCopiedCheckout(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Truncate beforeContent for preview
  const previewContent = beforeContent.length > 300
    ? beforeContent.slice(0, 300) + "..."
    : beforeContent;

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-3 border-b flex items-start justify-between gap-3",
          isDark ? "border-gray-700" : "border-gray-200",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <img
            src={item.pr.authorAvatar}
            alt={item.pr.author}
            className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "font-medium truncate",
                  isDark ? "text-gray-100" : "text-gray-900",
                )}
              >
                {item.pr.title}
              </span>
            </div>
            <div
              className={cn(
                "text-xs mt-0.5 flex items-center gap-1.5",
                isDark ? "text-gray-400" : "text-gray-500",
              )}
            >
              <GitPullRequest className="w-3 h-3" />
              <span>
                {item.pr.owner}/{item.pr.repo} #{item.pr.number}
              </span>
              <span>•</span>
              <span>{item.thread.path || "General comment"}</span>
              {item.thread.line && (
                <>
                  <span>•</span>
                  <span>Line {item.thread.line}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCopyCheckout}
            title={checkoutCommand}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              copiedCheckout
                ? "bg-green-500/20 text-green-300"
                : isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {copiedCheckout ? (
              <Check className="w-3 h-3" />
            ) : (
              <Terminal className="w-3 h-3" />
            )}
            <span>{copiedCheckout ? "Copied!" : "Checkout"}</span>
          </button>
          <button
            onClick={() => onNavigate(item.pr.owner, item.pr.repo, item.pr.number)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              isDark
                ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100",
            )}
          >
            <ArrowRight className="w-3 h-3" />
            <span>View PR</span>
          </button>
        </div>
      </div>

      {/* Comment Content */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <img
            src={item.comment.user.avatar_url}
            alt={item.comment.user.login}
            className="w-6 h-6 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  isDark ? "text-gray-200" : "text-gray-800",
                )}
              >
                {item.comment.user.login}
              </span>
              <span
                className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400",
                )}
              >
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </span>
            </div>

            {/* Preview of the comment */}
            {previewContent && (
              <div
                className={cn(
                  "text-sm mb-3",
                  isDark ? "text-gray-300" : "text-gray-700",
                )}
              >
                <Markdown content={previewContent} variant="compact" />
              </div>
            )}

            {/* Agent Prompt Block */}
            {prompt && <AgentPromptBlock prompt={prompt} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevinView() {
  const { theme } = useUIStore();
  const navigate = useNavigate();
  const { comments, loading, error, lastFetched, fetchDevinComments } = useDevinStore();
  const { recentlyViewedRepos } = usePRStore();
  const isDark = theme === "dark";

  // Fetch on mount and when repos change
  useEffect(() => {
    // Only fetch if we have repos and haven't fetched recently (within 5 minutes)
    const shouldFetch = recentlyViewedRepos.length > 0 && 
      (!lastFetched || Date.now() - lastFetched > 5 * 60 * 1000);
    
    if (shouldFetch) {
      fetchDevinComments();
    }
  }, [recentlyViewedRepos.length]);

  const handleNavigate = (owner: string, repo: string, prNumber: number) => {
    navigate(`/pulls/${owner}/${repo}/${prNumber}?tab=comments`, {
      state: { from: "/agents/devin" },
    });
  };

  const handleRefresh = () => {
    fetchDevinComments();
  };

  // Empty state when no repos configured
  if (recentlyViewedRepos.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center px-8 text-center",
          isDark ? "bg-gray-900" : "bg-white",
        )}
      >
        <div className="max-w-md space-y-4">
          <DevinIcon className="w-16 h-16 mx-auto opacity-50" />
          <h1
            className={cn(
              "text-2xl font-semibold",
              isDark ? "text-gray-100" : "text-gray-900",
            )}
          >
            Devin Review Comments
          </h1>
          <p
            className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-600",
            )}
          >
            View recent repositories to start seeing Devin&apos;s code review comments here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        isDark ? "bg-gray-900" : "bg-gray-50",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
        )}
      >
        <div className="flex items-center gap-3">
          <DevinIcon className="w-6 h-6" />
          <div>
            <h1
              className={cn(
                "text-lg font-semibold",
                isDark ? "text-gray-100" : "text-gray-900",
              )}
            >
              Devin Review Comments
            </h1>
            <p
              className={cn(
                "text-xs",
                isDark ? "text-gray-500" : "text-gray-500",
              )}
            >
              Unresolved code review feedback from Devin across your open PRs
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            loading
              ? "opacity-50 cursor-not-allowed"
              : isDark
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Error state */}
          {error && (
            <div
              className={cn(
                "mb-4 rounded-lg border px-4 py-3 flex items-center gap-3",
                isDark
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700",
              )}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && comments.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-4 animate-pulse",
                    isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full",
                        isDark ? "bg-gray-700" : "bg-gray-200",
                      )}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className={cn(
                          "h-4 rounded w-3/4",
                          isDark ? "bg-gray-700" : "bg-gray-200",
                        )}
                      />
                      <div
                        className={cn(
                          "h-3 rounded w-1/2",
                          isDark ? "bg-gray-700" : "bg-gray-200",
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && comments.length === 0 && (
            <div
              className={cn(
                "rounded-lg border px-6 py-12 text-center",
                isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
              )}
            >
              <Inbox
                className={cn(
                  "w-12 h-12 mx-auto mb-4",
                  isDark ? "text-gray-600" : "text-gray-300",
                )}
              />
              <h3
                className={cn(
                  "text-lg font-medium mb-2",
                  isDark ? "text-gray-200" : "text-gray-800",
                )}
              >
                All caught up!
              </h3>
              <p
                className={cn(
                  "text-sm",
                  isDark ? "text-gray-400" : "text-gray-500",
                )}
              >
                No unresolved Devin review comments on your open PRs.
              </p>
            </div>
          )}

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-4">
              <div
                className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  isDark ? "text-gray-400" : "text-gray-600",
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} unresolved comment{comments.length !== 1 ? "s" : ""}</span>
              </div>

              {comments.map((item) => (
                <DevinCommentCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
