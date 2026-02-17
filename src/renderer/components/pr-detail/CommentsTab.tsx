import { useMemo, useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  MessageCircleReply,
  CheckCircle2,
  Filter,
  MoreVertical,
  Trash2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { ReviewThread } from "../../services/github";
import { CompactMarkdownEditor } from "../CompactMarkdownEditor";
import { Markdown } from "../Markdown";
import { DeleteCommentDialog } from "./DeleteCommentDialog";
import { AgentPromptBlock, parseAgentPrompt, isAgentUser } from "../AgentPromptBlock";

/**
 * Renders agent comments with special formatting for "Prompt for agents" sections
 */
function AgentCommentContent({ body }: { body: string }) {
  const { beforeContent, prompt, afterContent } = parseAgentPrompt(body);

  return (
    <>
      {beforeContent && <Markdown content={beforeContent} variant="full" />}
      {prompt && <AgentPromptBlock prompt={prompt} />}
      {afterContent && <Markdown content={afterContent} variant="full" />}
    </>
  );
}

interface CommentsTabProps {
  threads: ReviewThread[];
  theme: "dark" | "light";
  currentUser: { login: string; avatar_url?: string } | null;
  canReply: boolean;
  onReply: (threadId: string, commentId: number, body: string) => Promise<void>;
  onResolve: (threadId: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onToggleReaction: (
    commentId: number,
    reaction: "thumbs_up" | "thumbs_down",
  ) => Promise<void>;
}

export function CommentsTab({
  threads,
  theme,
  currentUser,
  canReply,
  onReply,
  onResolve,
  onDeleteComment,
  onToggleReaction,
}: CommentsTabProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openReplyThreads, setOpenReplyThreads] = useState<string[]>([]);
  const [replyingThreadId, setReplyingThreadId] = useState<string | null>(null);
  const [resolvingThreadId, setResolvingThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [openMenuCommentId, setOpenMenuCommentId] = useState<number | null>(null);
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuCommentId(null);
      }
    };

    if (openMenuCommentId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuCommentId]);

  const handleDeleteClick = (commentId: number) => {
    setOpenMenuCommentId(null);
    setDeleteConfirmCommentId(commentId);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmCommentId === null) return;

    setIsDeleting(true);
    try {
      await onDeleteComment(deleteConfirmCommentId);
      setDeleteConfirmCommentId(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedThreads = useMemo(
    () =>
      [...threads].sort((a, b) => {
        const aLatest = a.comments[a.comments.length - 1]?.created_at || "";
        const bLatest = b.comments[b.comments.length - 1]?.created_at || "";
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      }),
    [threads],
  );

  const openCount = useMemo(
    () => threads.filter((thread) => thread.state !== "resolved").length,
    [threads],
  );

  const resolvedCount = useMemo(
    () => threads.filter((thread) => thread.state === "resolved").length,
    [threads],
  );

  const filteredThreads = useMemo(() => {
    if (filter === "open") {
      return sortedThreads.filter((thread) => thread.state !== "resolved");
    }
    return sortedThreads.filter((thread) => thread.state === "resolved");
  }, [sortedThreads, filter]);

  const toggleReply = (threadId: string) => {
    setOpenReplyThreads((prev) =>
      prev.includes(threadId)
        ? prev.filter((id) => id !== threadId)
        : [...prev, threadId],
    );
  };

  const handleReplySubmit = async (threadId: string) => {
    const draft = drafts[threadId]?.trim();
    if (!draft) return;

    const thread = threads.find((t) => t.id === threadId);
    const targetComment = thread?.comments[thread?.comments.length - 1];
    if (!thread || !targetComment) {
      alert("Unable to reply to this thread. Please refresh and try again.");
      return;
    }

    setReplyingThreadId(threadId);
    try {
      await onReply(threadId, targetComment.id, draft);
      setDrafts((prev) => ({ ...prev, [threadId]: "" }));
      setOpenReplyThreads((prev) => prev.filter((id) => id !== threadId));
    } catch (error) {
      console.error("Failed to reply to review thread", error);
      alert("Failed to post reply. Please try again.");
    } finally {
      setReplyingThreadId(null);
    }
  };

  const handleResolve = async (threadId: string) => {
    setResolvingThreadId(threadId);
    try {
      await onResolve(threadId);
    } catch (error) {
      console.error("Failed to resolve review thread", error);
      alert("Failed to resolve thread. Please try again.");
    } finally {
      setResolvingThreadId(null);
    }
  };

  const handleToggleReaction = async (
    commentId: number,
    reaction: "thumbs_up" | "thumbs_down",
  ) => {
    try {
      await onToggleReaction(commentId, reaction);
    } catch (error) {
      console.error("Failed to toggle reaction", error);
      alert("Failed to toggle reaction. Please try again.");
    }
  };

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto",
        isDark ? "bg-gray-900" : "bg-white",
      )}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Filter className="w-3 h-3" />
            <span>Filter threads</span>
          </div>
          <div className="flex items-center gap-2">
            {(
              [
                { key: "open" as const, label: "Open", count: openCount },
                { key: "resolved" as const, label: "Resolved", count: resolvedCount },
              ]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-colors",
                  filter === key
                    ? isDark
                      ? "bg-blue-500/20 border-blue-400 text-blue-200"
                      : "bg-blue-50 border-blue-300 text-blue-700"
                    : isDark
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-100",
                )}
              >
                {label}
                <span
                  className={cn(
                    "ml-1 text-[10px] font-semibold",
                    filter === key
                      ? isDark
                        ? "text-blue-200"
                        : "text-blue-700"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-500",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredThreads.length === 0 && (
          <div
            className={cn(
              "rounded-md border px-4 py-6 flex items-center gap-3 text-sm",
              isDark
                ? "border-gray-700 bg-gray-800 text-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-600",
            )}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium text-sm">
                {filter === "open"
                  ? "All review comments resolved"
                  : "No resolved threads yet"}
              </div>
              <p className="text-xs">
                {filter === "open"
                  ? "There are no open review threads on this pull request."
                  : "Resolve discussions during review to keep track of progress."}
              </p>
            </div>
          </div>
        )}

        {filteredThreads.map((thread) => {
          const rootComment = thread.comments[0];
          const diffHunk = rootComment?.diff_hunk;
          const locationLabel = thread.line || thread.original_line;
          const isReplyOpen = openReplyThreads.includes(thread.id);
          const draftValue = drafts[thread.id] ?? "";
          const isResolved = thread.state === "resolved";

          return (
            <div
              key={thread.id}
              className={cn(
                "rounded-md border",
                isDark
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white",
              )}
            >
              <div
                className={cn(
                  "px-4 py-3 border-b flex items-start justify-between gap-4",
                  isDark ? "border-gray-700" : "border-gray-200",
                )}
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono truncate">
                    {thread.path || "Unknown file"}
                  </div>
                  <div
                    className={cn(
                      "text-[11px]",
                      isDark ? "text-gray-400" : "text-gray-500",
                    )}
                  >
                    {locationLabel ? `Line ${locationLabel}` : "Comment"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReply(thread.id)}
                    disabled={!canReply}
                    className={cn(
                      "btn btn-secondary text-xs flex items-center gap-1 px-3 py-1",
                      !canReply &&
                      (isDark
                        ? "opacity-40 cursor-not-allowed"
                        : "opacity-50 cursor-not-allowed"),
                    )}
                  >
                    <MessageCircleReply className="w-3 h-3" />
                    Reply
                  </button>
                  {isResolved ? (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full border",
                        isDark
                          ? "border-emerald-500/40 text-emerald-300"
                          : "border-emerald-300 text-emerald-700 bg-emerald-50",
                      )}
                    >
                      Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolve(thread.id)}
                      disabled={!canReply || resolvingThreadId === thread.id}
                      className={cn(
                        "btn btn-primary text-xs px-3 py-1",
                        (!canReply || resolvingThreadId === thread.id) &&
                        (isDark
                          ? "opacity-40 cursor-not-allowed"
                          : "opacity-50 cursor-not-allowed"),
                      )}
                    >
                      {resolvingThreadId === thread.id ? "Resolving..." : "Resolve"}
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 space-y-4">
                {diffHunk && (
                  <pre
                    className={cn(
                      "text-xs font-mono whitespace-pre-wrap overflow-x-auto rounded-md px-3 py-2",
                      isDark
                        ? "bg-gray-900 text-gray-200 border border-gray-700"
                        : "bg-gray-50 text-gray-700 border border-gray-200",
                    )}
                  >
                    {diffHunk}
                  </pre>
                )}

                <div className="space-y-3">
                  {thread.comments.map((comment) => {
                    const commentDate = comment.created_at
                      ? new Date(comment.created_at)
                      : null;
                    const hasValidDate =
                      commentDate && !Number.isNaN(commentDate.getTime());
                    const relativeTime = hasValidDate
                      ? formatDistanceToNow(commentDate!, { addSuffix: true })
                      : "recently";
                    const isAuthor = currentUser?.login === comment.user.login;
                    const hasThumbsUp = comment.hasThumbsUp ?? false;
                    const hasThumbsDown = comment.hasThumbsDown ?? false;
                    const isUpdatingReaction = comment.isPerformingOperation ?? false;

                    return (
                       <div key={comment.id} className="flex gap-3">
                         <img
                           src={comment.user.avatar_url}
                           alt={comment.user.login}
                           className="w-8 h-8 rounded-full flex-shrink-0"
                         />
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-xs">
                               <span
                                 className={cn(
                                   "text-sm font-semibold",
                                   isDark ? "text-gray-100" : "text-gray-800",
                                 )}
                               >
                                 {comment.user.login}
                               </span>
                               <span
                                 className={cn(
                                   "text-[11px]",
                                   isDark ? "text-gray-400" : "text-gray-500",
                                 )}
                               >
                                 {relativeTime}
                               </span>
                             </div>
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={() => handleToggleReaction(comment.id, "thumbs_up")}
                                 disabled={isUpdatingReaction}
                                 title={
                                   isUpdatingReaction
                                     ? "Updating reaction..."
                                     : hasThumbsUp
                                       ? "Thumbs-up added"
                                       : "Add thumbs-up reaction"
                                 }
                                 aria-label="Toggle thumbs-up reaction"
                                 className={cn(
                                   "p-1.5 rounded border transition-colors",
                                   isDark
                                     ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                                     : "border-gray-200 text-gray-600 hover:bg-gray-100",
                                   hasThumbsUp &&
                                     (isDark
                                       ? "border-blue-500/70 text-blue-300"
                                       : "border-blue-300 text-blue-600"),
                                   isUpdatingReaction &&
                                     (isDark
                                       ? "opacity-50 cursor-not-allowed"
                                       : "opacity-60 cursor-not-allowed"),
                                 )}
                               >
                                 <ThumbsUp className="w-3 h-3" />
                               </button>
                               <button
                                 onClick={() => handleToggleReaction(comment.id, "thumbs_down")}
                                 disabled={isUpdatingReaction}
                                 title={
                                   isUpdatingReaction
                                     ? "Updating reaction..."
                                     : hasThumbsDown
                                       ? "Thumbs-down added"
                                       : "Add thumbs-down reaction"
                                 }
                                 aria-label="Toggle thumbs-down reaction"
                                 className={cn(
                                   "p-1.5 rounded border transition-colors",
                                   isDark
                                     ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                                     : "border-gray-200 text-gray-600 hover:bg-gray-100",
                                   hasThumbsDown &&
                                     (isDark
                                       ? "border-red-500/70 text-red-300"
                                       : "border-red-300 text-red-600"),
                                   isUpdatingReaction &&
                                     (isDark
                                       ? "opacity-50 cursor-not-allowed"
                                       : "opacity-60 cursor-not-allowed"),
                                 )}
                               >
                                 <ThumbsDown className="w-3 h-3" />
                               </button>

                               {isAuthor && (
                                 <div
                                   className="relative"
                                   ref={openMenuCommentId === comment.id ? menuRef : undefined}
                                 >
                                   <button
                                     onClick={() =>
                                       setOpenMenuCommentId(
                                         openMenuCommentId === comment.id ? null : comment.id,
                                       )
                                     }
                                     className={cn(
                                       "p-1 rounded transition-colors",
                                       isDark
                                         ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                                         : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
                                     )}
                                   >
                                     <MoreVertical className="w-4 h-4" />
                                   </button>

                                   {openMenuCommentId === comment.id && (
                                     <div
                                       className={cn(
                                         "absolute right-0 mt-1 py-1 rounded shadow-lg z-10 min-w-[120px]",
                                         isDark
                                           ? "bg-gray-700 border border-gray-600"
                                           : "bg-white border border-gray-200",
                                       )}
                                     >
                                       <button
                                         onClick={() => handleDeleteClick(comment.id)}
                                         className={cn(
                                           "flex items-center space-x-2 px-3 py-1.5 w-full text-left text-sm transition-colors",
                                           "text-red-500 hover:bg-red-500 hover:text-white",
                                         )}
                                       >
                                         <Trash2 className="w-3 h-3" />
                                         <span>Delete</span>
                                       </button>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </div>
                           </div>
                          <div className={cn(
                            "mt-2 text-sm overflow-hidden",
                            isDark ? "text-gray-300" : "text-gray-700"
                          )}>
                            {isAgentUser(comment.user.login) ? (
                              <AgentCommentContent body={comment.body} />
                            ) : (
                              <Markdown content={comment.body} variant="full" />
                            )}
                          </div>
                         </div>
                       </div>
                     );
                  })}
                </div>

                {isReplyOpen && (
                  <div
                    className={cn(
                      "border rounded-md",
                      isDark ? "border-gray-700" : "border-gray-200",
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2 border-b flex items-center gap-2",
                        isDark ? "border-gray-700" : "border-gray-200",
                      )}
                    >
                      {currentUser && (
                        <img
                          src={currentUser.avatar_url || ""}
                          alt={currentUser.login}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-xs font-medium">Reply to thread</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {canReply ? (
                        <>
                          <CompactMarkdownEditor
                            value={draftValue}
                            onChange={(value) =>
                              setDrafts((prev) => ({ ...prev, [thread.id]: value }))
                            }
                            placeholder="Leave a reply..."
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => {
                                setOpenReplyThreads((prev) =>
                                  prev.filter((id) => id !== thread.id),
                                );
                                setDrafts((prev) => ({ ...prev, [thread.id]: "" }));
                              }}
                              className="btn btn-ghost px-3 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReplySubmit(thread.id)}
                              disabled={
                                replyingThreadId === thread.id || !draftValue.trim()
                              }
                              className={cn(
                                "btn btn-primary px-3 py-1",
                                (replyingThreadId === thread.id || !draftValue.trim()) &&
                                (isDark
                                  ? "opacity-40 cursor-not-allowed"
                                  : "opacity-50 cursor-not-allowed"),
                              )}
                            >
                              {replyingThreadId === thread.id ? "Posting..." : "Post reply"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2 text-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Sign in with GitHub to reply to review comments.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deleteConfirmCommentId !== null && (
        <DeleteCommentDialog
          theme={theme}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirmCommentId(null)}
        />
      )}
    </div>
  );
}
