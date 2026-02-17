import { forwardRef, useRef, useImperativeHandle, useState, useEffect } from "react";
import { PullRequest, Comment, Review } from "../services/github";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { PRDescription } from "./conversation/PRDescription";
import { BranchInfo } from "./conversation/BranchInfo";
import { PRLabels } from "./conversation/PRLabels";
import { TimelineItem } from "./conversation/TimelineItem";
import { CommentForm, CommentFormRef, CommentSubmitResult } from "./conversation/CommentForm";
import { ParticipantsSidebar } from "./conversation/ParticipantsSidebar";
import { AddLabelDialog } from "./conversation/AddLabelDialog";
import { useParticipantStats } from "./conversation/useParticipantStats";
import { useLabelStore } from "../stores/labelStore";
import { DeleteCommentDialog } from "./pr-detail/DeleteCommentDialog";

interface ConversationTabProps {
  pr: PullRequest;
  comments: Comment[];
  reviews: Review[];
  onCommentSubmit: (result: CommentSubmitResult) => void;
  onDeleteComment: (commentId: number) => Promise<void>;
  onToggleReaction: (
    commentId: number,
    reaction: "thumbs_up" | "thumbs_down",
  ) => Promise<void>;
  onUpdateDescription: (body: string) => Promise<void>;
}

export interface ConversationTabRef {
  focusCommentForm: () => void;
}

export const ConversationTab = forwardRef<ConversationTabRef, ConversationTabProps>(function ConversationTab({
  pr,
  comments,
  reviews,
  onCommentSubmit,
  onDeleteComment,
  onToggleReaction,
  onUpdateDescription,
}, ref) {
  const { user, token } = useAuthStore();
  const { theme, addLabelDialogOpen, setAddLabelDialogOpen } = useUIStore();
  const commentFormRef = useRef<CommentFormRef>(null);
  const [availableLabels, setAvailableLabels] = useState<
    Array<{ name: string; color: string; description?: string | null }>
  >([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useImperativeHandle(ref, () => ({
    focusCommentForm: () => {
      commentFormRef.current?.focus();
    },
  }));

  const addLabelAsync = async (labelName: string) => {
    const { GitHubAPI } = await import("../services/github");
    const { usePRStore } = await import("../stores/prStore");

    const api = new GitHubAPI(token);

    // Make API call to add label
    await api.addLabels(
      pr.base.repo.owner.login,
      pr.base.repo.name,
      pr.number,
      [labelName]
    );

    // Update the store with optimistic update
    const prStore = usePRStore.getState();
    const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
    const currentPR = prStore.pullRequests.get(key);

    if (currentPR) {
      const updatedPR = {
        ...currentPR,
        labels: [
          ...currentPR.labels,
          {
            name: labelName,
            color: availableLabels.find((l) => l.name === labelName)?.color || "0366d6",
          },
        ],
      };
      prStore.updatePR(updatedPR);
    }
  };

  const removeLabelAsync = async (labelName: string) => {
    const { GitHubAPI } = await import("../services/github");
    const { usePRStore } = await import("../stores/prStore");

    const api = new GitHubAPI(token);

    // Make API call to remove label
    await api.removeLabel(
      pr.base.repo.owner.login,
      pr.base.repo.name,
      pr.number,
      labelName
    );

    // Update the store with optimistic update
    const prStore = usePRStore.getState();
    const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
    const currentPR = prStore.pullRequests.get(key);

    if (currentPR) {
      const updatedPR = {
        ...currentPR,
        labels: currentPR.labels.filter((l) => l.name !== labelName),
      };
      prStore.updatePR(updatedPR);
    }
  };

  const handleAddLabel = async (labelName: string) => {
    try {
      await addLabelAsync(labelName);
    } catch (error) {
      console.error("Failed to add label:", error);
    }
  };

  const handleRemoveLabel = async (labelName: string) => {
    try {
      await removeLabelAsync(labelName);
    } catch (error) {
      console.error("Failed to remove label:", error);
    }
  };

  // Fetch labels when dialog opens (cached by labelStore)
  useEffect(() => {
    if (addLabelDialogOpen && pr.base.repo.owner.login && pr.base.repo.name) {
      setIsLoadingLabels(true);
      (async () => {
        try {
          const { fetchLabels } = useLabelStore.getState();
          const labels = await fetchLabels(
            pr.base.repo.owner.login,
            pr.base.repo.name
          );
          setAvailableLabels(labels);
        } catch (error) {
          console.error("Failed to fetch labels:", error);
        } finally {
          setIsLoadingLabels(false);
        }
      })();
    }
  }, [addLabelDialogOpen, pr.base.repo.owner.login, pr.base.repo.name]);

  // Calculate participant stats
  const participantStats = useParticipantStats(pr, comments, reviews);

  const handleDeleteClick = (commentId: number) => {
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

  const handleToggleReaction = async (
    commentId: number,
    reaction: "thumbs_up" | "thumbs_down",
  ) => {
    try {
      await onToggleReaction(commentId, reaction);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      alert("Failed to toggle reaction. Please try again.");
    }
  };

  // Combine comments and reviews into a timeline
  // Filter out reviews that are PENDING or have no submitted_at timestamp
  const timeline = [
    ...comments
      .filter((c) => c.created_at && c.user) // Filter out invalid comments
      .map((c) => ({
        ...c,
        type: "comment" as const,
        timestamp: c.created_at,
      })),
    ...reviews
      .filter(
        (r) =>
          r.state !== "PENDING" &&
          r.state !== "DISMISSED" &&
          r.submitted_at &&
          r.user,
      ) // Only show submitted, non-dismissed reviews with valid data
      .map((r) => ({
        ...r,
        type: "review" as const,
        timestamp: r.submitted_at || "",
      })),
  ]
    .filter((item) => item.timestamp && new Date(item.timestamp).getTime() > 0) // Filter out items with invalid timestamps
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* PR Description */}
          <PRDescription
            pr={pr}
            theme={theme}
            currentUser={user}
            onUpdateDescription={onUpdateDescription}
          />

          {/* Branch info */}
          <BranchInfo pr={pr} theme={theme} />

          {/* Labels */}
          {pr.labels.length > 0 && <PRLabels pr={pr} theme={theme} />}

          {/* Timeline */}
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <TimelineItem
                key={`${item.type}-${item.id}-${index}`}
                item={item}
                theme={theme}
                currentUser={user}
                onDeleteComment={handleDeleteClick}
                onToggleReaction={handleToggleReaction}
              />
            ))}
          </div>

          {/* Comment form */}
          <CommentForm
            ref={commentFormRef}
            pr={pr}
            user={user}
            token={token}
            theme={theme}
            onCommentSubmit={onCommentSubmit}
          />
        </div>
      </div>

      {/* Participants Sidebar */}
      <ParticipantsSidebar
        participants={participantStats}
        theme={theme}
        owner={pr.base.repo.owner.login}
        repo={pr.base.repo.name}
        prNumber={pr.number}
        prAuthor={pr.user.login}
        currentUser={user?.login}
      />

      {/* Add Label Dialog */}
      <AddLabelDialog
        isOpen={addLabelDialogOpen}
        onClose={() => setAddLabelDialogOpen(false)}
        onSelect={handleAddLabel}
        onRemove={handleRemoveLabel}
        availableLabels={availableLabels}
        selectedLabels={pr.labels.map((l) => l.name)}
        theme={theme}
        isLoadingLabels={isLoadingLabels}
      />

      {/* Delete Comment Confirmation Dialog */}
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
});
