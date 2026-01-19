import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "../../utils/cn";
import { PullRequest, Comment, Review } from "../../services/github";
import { MentionTypeahead } from "../MentionTypeahead";
import { useOrgStore } from "../../stores/orgStore";

export type CommentSubmitResult = 
  | { type: "comment"; comment: Comment }
  | { type: "review"; review: Review };

interface CommentFormProps {
  pr: PullRequest;
  user: { avatar_url: string; login: string } | null;
  token: string | null;
  theme: "light" | "dark";
  onCommentSubmit: (result: CommentSubmitResult) => void;
}

export interface CommentFormRef {
  focus: () => void;
}

export const CommentForm = forwardRef<CommentFormRef, CommentFormProps>(function CommentForm({
  pr,
  user,
  token,
  theme,
  onCommentSubmit,
}, ref) {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewType, setReviewType] = useState<
    "comment" | "approve" | "request_changes"
  >("comment");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [orgMembers, setOrgMembers] = useState<Array<{ login: string; avatar_url: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetchOrgMembers = useOrgStore((state) => state.fetchOrgMembers);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Fetch org members for mentions
  useEffect(() => {
    const org = pr.base.repo.owner.login;
    fetchOrgMembers(org).then((members) => {
      setOrgMembers(members);
    });
  }, [pr.base.repo.owner.login, fetchOrgMembers]);

  // Get all potential mentions (all org members)
  const allMentionCandidates = orgMembers;

  // Filter mention candidates based on query
  const filteredMentionCandidates = mentionQuery
    ? allMentionCandidates.filter((candidate) =>
        candidate.login.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setCommentText(text);
    setCursorPosition(pos);

    // Check if we're after an @ symbol
    const textBeforeCursor = text.substring(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Check if @ is at start or after whitespace
      const beforeAt = textBeforeCursor[lastAtIndex - 1];
      if (lastAtIndex === 0 || /\s/.test(beforeAt)) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Only show menu if query is alphanumeric (no spaces)
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
  };

  const handleMention = (login: string) => {
    const text = commentText;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Replace @query with @login
      const before = text.substring(0, lastAtIndex + 1);
      const after = text.substring(cursorPosition);
      const newText = `${before}${login} ${after}`;
      setCommentText(newText);

      // Reset mention state
      setShowMentionMenu(false);
      setMentionQuery("");

      // Set cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + login.length + 2;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention menu navigation
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

    // Original submit handling
    if (e.key === "Enter" && e.metaKey && commentText.trim() && !isSubmitting) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !token || !user) return;

    const submittedText = commentText;
    setIsSubmitting(true);
    setCommentText("");

    // Create optimistic comment/review immediately
    const now = new Date().toISOString();
    if (reviewType === "comment") {
      const optimisticComment: Comment = {
        id: Date.now(), // Temporary ID
        body: submittedText,
        user: { login: user.login, avatar_url: user.avatar_url },
        created_at: now,
        updated_at: now,
        html_url: "",
      };
      onCommentSubmit({ type: "comment", comment: optimisticComment });
    } else {
      const optimisticReview: Review = {
        id: Date.now(),
        body: submittedText,
        state: reviewType === "approve" ? "APPROVED" : "CHANGES_REQUESTED",
        user: { login: user.login, avatar_url: user.avatar_url },
        submitted_at: now,
        commit_id: "",
      };
      onCommentSubmit({ type: "review", review: optimisticReview });
    }

    try {
      const { GitHubAPI } = await import("../../services/github");
      const api = new GitHubAPI(token);

      if (reviewType === "comment") {
        await api.createComment(
          pr.base.repo.owner.login,
          pr.base.repo.name,
          pr.number,
          submittedText,
        );
      } else {
        await api.createReview(
          pr.base.repo.owner.login,
          pr.base.repo.name,
          pr.number,
          submittedText,
          reviewType === "approve" ? "APPROVE" : "REQUEST_CHANGES",
        );
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      // Restore text on error so user can retry
      setCommentText(submittedText);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pr.state !== "open") return null;

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-start space-x-3">
        <img
          src={user?.avatar_url || ""}
          alt={user?.login || "You"}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1 relative">
          <MentionTypeahead
            value={mentionQuery}
            candidates={filteredMentionCandidates}
            onMention={handleMention}
            theme={theme}
            isOpen={showMentionMenu && filteredMentionCandidates.length > 0}
            selectedIndex={selectedMentionIndex}
            onSelectedIndexChange={setSelectedMentionIndex}
          />
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="input w-full h-32 resize-none mb-3"
            placeholder="Leave a comment... (⌘↵ to submit, @ to mention)"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReviewType("comment")}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  reviewType === "comment"
                    ? theme === "dark"
                      ? "bg-gray-700"
                      : "bg-gray-200"
                    : theme === "dark"
                      ? "hover:bg-gray-800"
                      : "hover:bg-gray-100",
                )}
              >
                Comment
              </button>
              <button
                onClick={() => setReviewType("approve")}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  reviewType === "approve"
                    ? theme === "dark"
                      ? "bg-green-900"
                      : "bg-green-100"
                    : theme === "dark"
                      ? "hover:bg-gray-800"
                      : "hover:bg-gray-100",
                )}
              >
                Approve
              </button>
              <button
                onClick={() => setReviewType("request_changes")}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  reviewType === "request_changes"
                    ? theme === "dark"
                      ? "bg-red-900"
                      : "bg-red-100"
                    : theme === "dark"
                      ? "hover:bg-gray-800"
                      : "hover:bg-gray-100",
                )}
              >
                Request changes
              </button>
            </div>

            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || isSubmitting}
              className="btn btn-primary text-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
