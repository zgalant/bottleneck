import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Loader2, MessageSquare, X } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  ActiveOverlay,
  InlineCommentThread,
} from "./commentUtils";
import { MentionTypeahead } from "../MentionTypeahead";
import { useOrgStore } from "../../stores/orgStore";

interface CommentOverlayProps {
  overlay: ActiveOverlay;
  position: { top: number; left: number };
  theme: string;
  canSubmitComments: boolean;
  currentUser: { login: string; avatar_url?: string } | null;
  activeThread: InlineCommentThread | null;
  commentDraft: string;
  commentError: string | null;
  isSubmittingComment: boolean;
  overlayWidth: number;
  overlayHeight: number;
  resizeMode: "none" | "width" | "height" | "both";
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onResizeStart: (
    mode: "width" | "height" | "both",
  ) => (e: ReactMouseEvent) => void;
  orgName?: string;
}

export const CommentOverlay: FC<CommentOverlayProps> = ({
  overlay,
  position,
  theme,
  canSubmitComments,
  currentUser,
  activeThread,
  commentDraft,
  commentError,
  isSubmittingComment,
  overlayWidth,
  overlayHeight,
  resizeMode,
  onCommentDraftChange,
  onClose,
  onSubmit,
  onResizeStart,
  orgName,
}) => {
  const isDark = theme === "dark";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [orgMembers, setOrgMembers] = useState<Array<{ login: string; avatar_url: string; name?: string }>>([]);
  const fetchOrgMembers = useOrgStore((state) => state.fetchOrgMembers);

  useEffect(() => {
    if (orgName) {
      fetchOrgMembers(orgName).then((members) => {
        setOrgMembers(members);
      });
    }
  }, [orgName, fetchOrgMembers]);

  const filteredMentionCandidates = mentionQuery
    ? orgMembers.filter((candidate) => {
        const query = mentionQuery.toLowerCase();
        return (
          candidate.login.toLowerCase().includes(query) ||
          (candidate.name?.toLowerCase().includes(query) ?? false)
        );
      })
    : [];

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    onCommentDraftChange(text);
    setCursorPosition(pos);

    const textBeforeCursor = text.substring(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor[lastAtIndex - 1];
      if (lastAtIndex === 0 || /\s/.test(beforeAt)) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        if (/^\w*$/.test(query)) {
          setMentionQuery(query);
          setShowMentionMenu(true);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }

    setShowMentionMenu(false);
    setMentionQuery("");
  }, [onCommentDraftChange]);

  const handleMention = useCallback((login: string) => {
    const text = commentDraft;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const before = text.substring(0, lastAtIndex + 1);
      const after = text.substring(cursorPosition);
      const newText = `${before}${login} ${after}`;
      onCommentDraftChange(newText);

      setShowMentionMenu(false);
      setMentionQuery("");

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + login.length + 2;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }
  }, [commentDraft, cursorPosition, onCommentDraftChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          (prev + 1) % filteredMentionCandidates.length
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev === 0 ? filteredMentionCandidates.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleMention(filteredMentionCandidates[selectedMentionIndex].login);
        return;
      }
      if (e.key === "Escape") {
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && e.metaKey && commentDraft.trim() && !isSubmittingComment) {
      e.preventDefault();
      onSubmit();
    }
  }, [showMentionMenu, filteredMentionCandidates, selectedMentionIndex, handleMention, commentDraft, isSubmittingComment, onSubmit]);

  return (
    <div
      className={cn(
        "absolute rounded-md shadow-lg border z-20 flex flex-col",
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        resizeMode !== "none" && "select-none",
      )}
      style={{
        top: position.top,
        left: position.left,
        width: `${overlayWidth}px`,
        height: `${overlayHeight}px`,
        maxWidth: "90vw",
        maxHeight: "80vh",
      }}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 border-b",
          isDark ? "border-gray-700 text-gray-100" : "border-gray-200 text-gray-800",
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {canSubmitComments && currentUser && overlay.type === "new" && (
            <img
              src={currentUser.avatar_url || ""}
              alt={currentUser.login || "You"}
              className="w-5 h-5 rounded-full flex-shrink-0"
            />
          )}
          <div className="flex flex-col text-xs min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-xs">
              <MessageSquare className="w-3 h-3" />
              {overlay.type === "thread" ? "Conversation" : "Start review comment"}
            </div>
            <span
              className={cn(
                "text-[10px] truncate",
                isDark ? "text-gray-400" : "text-gray-500",
              )}
            >
              {overlay.target.startLineNumber &&
                overlay.target.startLineNumber !== overlay.target.lineNumber ? (
                <>
                  Lines {overlay.target.startLineNumber}–{overlay.target.lineNumber}
                </>
              ) : (
                <>Line {overlay.target.lineNumber}</>
              )}
              {overlay.target.side === "LEFT" ? " • base" : " • head"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={cn(
            "p-1 rounded transition-colors",
            isDark
              ? "text-gray-400 hover:text-gray-100 hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
          )}
          aria-label="Close comment panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2 flex-1 flex flex-col gap-2 min-h-0 overflow-visible">
        {overlay.type === "thread" && activeThread && (
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1 text-sm">
            {activeThread.comments.map((comment) => (
              <div key={comment.id} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.login}
                    className="w-4 h-4 rounded-full"
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isDark ? "text-gray-100" : "text-gray-800",
                    )}
                  >
                    {comment.user.login}
                  </span>
                  <span className={cn("text-[10px]", isDark ? "text-gray-400" : "text-gray-500")}
                  >
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-xs whitespace-pre-wrap leading-relaxed",
                    isDark ? "text-gray-200" : "text-gray-700",
                  )}
                >
                  {comment.body}
                </div>
              </div>
            ))}
          </div>
        )}

        {overlay.type === "thread" && !activeThread && (
          <div
            className={cn(
              "text-sm rounded-md px-3 py-2",
              isDark ? "bg-amber-900/40 text-amber-200" : "bg-amber-50 text-amber-700",
            )}
          >
            This comment thread is no longer available on the current diff.
          </div>
        )}

        {!canSubmitComments ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
              isDark ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-700",
            )}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Sign in with GitHub to leave review comments.</span>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 relative">
              <textarea
                ref={textareaRef}
                value={commentDraft}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  overlay.type === "thread"
                    ? "Reply to this thread... (@ to mention, ⌘↵ to submit)"
                    : "Leave a comment on this line... (@ to mention, ⌘↵ to submit)"
                }
                autoFocus
                className={cn(
                  "w-full flex-1 p-2 resize-none focus:outline-none text-xs rounded-md border",
                  isDark
                    ? "bg-gray-900 text-gray-100 placeholder-gray-500 border-gray-700"
                    : "bg-white text-gray-900 placeholder-gray-400 border-gray-300",
                )}
              />
              <MentionTypeahead
                value={mentionQuery}
                candidates={filteredMentionCandidates}
                onMention={handleMention}
                theme={isDark ? "dark" : "light"}
                isOpen={showMentionMenu && filteredMentionCandidates.length > 0}
                selectedIndex={selectedMentionIndex}
                onSelectedIndexChange={setSelectedMentionIndex}
                dropDown
              />
            </div>

            {commentError && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span>{commentError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1 flex-shrink-0">
              <button onClick={onClose} className="btn btn-ghost text-xs px-3 py-1">
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={!commentDraft.trim() || isSubmittingComment || !canSubmitComments}
                className="btn btn-primary text-xs px-3 py-1 flex items-center gap-1"
              >
                {isSubmittingComment && <Loader2 className="w-3 h-3 animate-spin" />}
                {overlay.type === "thread" ? "Reply" : "Comment"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right edge resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-ew-resize group",
          "hover:bg-blue-500/30 transition-colors",
          resizeMode === "width" && "bg-blue-500/30",
        )}
        onMouseDown={onResizeStart("width")}
      >
        <div
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 -mr-1.5",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            resizeMode === "width" && "opacity-100",
          )}
        >
          <div className="flex flex-col gap-0.5">
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
          </div>
        </div>
      </div>

      {/* Bottom edge resize handle */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize group",
          "hover:bg-blue-500/30 transition-colors",
          resizeMode === "height" && "bg-blue-500/30",
        )}
        onMouseDown={onResizeStart("height")}
      >
        <div
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 -mb-1.5",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            resizeMode === "height" && "opacity-100",
          )}
        >
          <div className="flex gap-0.5">
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
            <div className={cn("w-0.5 h-0.5 rounded-full", isDark ? "bg-gray-400" : "bg-gray-500")} />
          </div>
        </div>
      </div>

      {/* Corner resize handle */}
      <div
        className={cn(
          "absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize",
          "hover:bg-blue-500/50 transition-colors",
          resizeMode === "both" && "bg-blue-500/50",
        )}
        onMouseDown={onResizeStart("both")}
      >
        <div
          className={cn(
            "absolute bottom-0.5 right-0.5 w-2 h-2",
            "border-b-2 border-r-2",
            isDark ? "border-gray-400" : "border-gray-500",
            "opacity-50 group-hover:opacity-100 transition-opacity",
            resizeMode === "both" && "opacity-100",
          )}
        />
      </div>
    </div>
  );
};
