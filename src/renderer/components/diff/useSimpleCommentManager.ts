import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import type { Comment, File } from "../../services/github";
import { GitHubAPI } from "../../services/github";
import {
  buildThreads,
  type ActiveOverlay,
  type CommentSide,
  type CommentTarget,
  type InlineCommentThread,
} from "./commentUtils";
import { useOverlayResize } from "./useOverlayResize";
import type { DiffModel } from "./useDiffModel";

interface SimpleCommentManagerParams {
  file: File;
  comments: Comment[];
  diffModel: DiffModel;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  showFullFile: boolean;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  token: string | null;
  onCommentAdded?: (comment: Comment) => void;
}

export interface SimpleCommentManagerState {
  commentThreads: InlineCommentThread[];
  activeOverlay: ActiveOverlay | null;
  overlayPosition: { top: number; left: number } | null;
  commentDraft: string;
  commentError: string | null;
  isSubmittingComment: boolean;
  canSubmitComments: boolean;
  overlayWidth: number;
  overlayHeight: number;
  resizeMode: ReturnType<typeof useOverlayResize>["resizeMode"];
  activeThread: InlineCommentThread | null;
  handleCommentDraftChange: (value: string) => void;
  handleCommentSubmit: () => Promise<void>;
  handleResizeStart: ReturnType<typeof useOverlayResize>["handleResizeStart"];
  handleOverlayTarget: (lineNumber: number, side: CommentSide) => void;
  closeOverlay: () => void;
}

export function useSimpleCommentManager({
  file,
  comments,
  diffModel,
  containerRef,
  showFullFile,
  repoOwner,
  repoName,
  pullNumber,
  token,
  onCommentAdded,
}: SimpleCommentManagerParams): SimpleCommentManagerState {
  const {
    mapLineForSide,
    mapPositionForSide,
    mapEditorLineToFileLine,
    getDiffPositionForEditorLine,
    getDiffHunkForLine,
  } = diffModel;

  const threadsRef = useRef<InlineCommentThread[]>([]);

  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<{ top: number; left: number } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const {
    width: overlayWidth,
    height: overlayHeight,
    resizeMode,
    handleResizeStart,
    resetSize: resetOverlaySize,
  } = useOverlayResize();

  const commentThreads = useMemo(() => {
    const threads = buildThreads(comments);

    return threads
      .map((thread) => {
        const rootComment = thread.comments[0];
        if (!rootComment) {
          return thread;
        }

        const side = thread.side;

        const positionLine = mapPositionForSide(
          side === "LEFT"
            ? rootComment.original_position ?? null
            : rootComment.position ?? null,
          side,
        );

        const baseLine =
          side === "LEFT"
            ? rootComment.original_line ?? rootComment.line ?? null
            : rootComment.line ?? rootComment.original_line ?? null;

        const mappedThreadLine = mapLineForSide(thread.lineNumber, side);
        const mappedBaseLine = mapLineForSide(baseLine, side);

        const lineNumber =
          positionLine ?? mappedThreadLine ?? mappedBaseLine ?? thread.lineNumber;

        const baseStartLine =
          side === "LEFT"
            ? rootComment.original_start_line ?? rootComment.start_line ?? null
            : rootComment.start_line ?? rootComment.original_start_line ?? null;

        const mappedStart = mapLineForSide(
          thread.startLineNumber ?? baseStartLine ?? null,
          side,
        );
        const mappedEnd = mapLineForSide(
          thread.endLineNumber ?? baseLine ?? null,
          side,
        );

        const startLineNumber = mappedStart ?? lineNumber;
        const endLineNumber = mappedEnd ?? lineNumber;

        const normalizedStart = Math.min(startLineNumber, endLineNumber);
        const normalizedEnd = Math.max(startLineNumber, endLineNumber);

        return {
          ...thread,
          lineNumber: normalizedEnd,
          startLineNumber: normalizedStart,
          endLineNumber: normalizedEnd,
        };
      })
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }, [comments, mapLineForSide, mapPositionForSide]);

  useEffect(() => {
    threadsRef.current = commentThreads;
  }, [commentThreads]);

  useEffect(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
    setIsSubmittingComment(false);
    resetOverlaySize();
  }, [file.filename, resetOverlaySize]);

  const canSubmitComments = Boolean(token && repoOwner && repoName && pullNumber);

  const handleOverlayTarget = useCallback(
    (lineNumber: number, side: CommentSide) => {
      const target: CommentTarget = {
        lineNumber,
        side,
      };

      const existingThread = threadsRef.current.find((thread) => {
        if (thread.side !== side) return false;
        const start = thread.startLineNumber ?? thread.lineNumber;
        const end = thread.endLineNumber ?? thread.lineNumber;
        return lineNumber >= start && lineNumber <= end;
      });

      if (existingThread) {
        setActiveOverlay({
          type: "thread",
          threadId: existingThread.id,
          target: {
            lineNumber: existingThread.lineNumber,
            startLineNumber: existingThread.startLineNumber,
            endLineNumber: existingThread.endLineNumber,
            side: existingThread.side,
          },
        });
      } else {
        setActiveOverlay({
          type: "new",
          target,
        });
      }

      // Calculate overlay position based on container
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Position near the top-left of the container with some offset
        setOverlayPosition({
          top: 60,
          left: Math.max(20, containerRect.width / 2 - 200),
        });
      }

      setCommentDraft("");
      setCommentError(null);
    },
    [containerRef],
  );

  useEffect(() => {
    if (activeOverlay?.type !== "thread") return;

    const latestThread = commentThreads.find(
      (thread) => thread.id === activeOverlay.threadId,
    );

    if (!latestThread) {
      setActiveOverlay(null);
      return;
    }

    if (
      latestThread.lineNumber !== activeOverlay.target.lineNumber ||
      latestThread.side !== activeOverlay.target.side
    ) {
      setActiveOverlay({
        type: "thread",
        threadId: latestThread.id,
        target: {
          lineNumber: latestThread.lineNumber,
          startLineNumber: latestThread.startLineNumber,
          endLineNumber: latestThread.endLineNumber,
          side: latestThread.side,
        },
      });
    }
  }, [activeOverlay, commentThreads]);

  useEffect(() => {
    if (!activeOverlay) {
      setCommentDraft("");
      setCommentError(null);
    }
  }, [activeOverlay]);

  const activeThread =
    activeOverlay?.type === "thread"
      ? commentThreads.find((thread) => thread.id === activeOverlay.threadId) ?? null
      : null;

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
    resetOverlaySize();
  }, [resetOverlaySize]);

  const handleCommentDraftChange = useCallback((value: string) => {
    setCommentDraft(value);
    if (commentError) {
      setCommentError(null);
    }
  }, [commentError]);

  const handleCommentSubmit = useCallback(async () => {
    if (!activeOverlay || !canSubmitComments || !token) return;

    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const api = new GitHubAPI(token);

      if (activeOverlay.type === "new") {
        const { lineNumber, side, startLineNumber, endLineNumber } =
          activeOverlay.target;
        const startLine = startLineNumber ?? lineNumber;
        const endLine = endLineNumber ?? lineNumber;
        const startLineForApi =
          mapEditorLineToFileLine(startLine, side) ?? startLine;
        const endLineForApi =
          mapEditorLineToFileLine(endLine, side) ?? endLine;
        const isMultiLineSelection = startLine !== endLine;
        const isMultiLineApi = startLineForApi !== endLineForApi;

        const position = !showFullFile
          ? getDiffPositionForEditorLine(endLine, side)
          : undefined;

        if (!showFullFile && !isMultiLineSelection && !isMultiLineApi && position !== undefined) {
          const newComment = await api.createComment(
            repoOwner,
            repoName,
            pullNumber,
            trimmed,
            file.filename,
            undefined,
            side,
            undefined,
            undefined,
            position,
          );

          onCommentAdded?.(newComment);
          setActiveOverlay({
            type: "thread",
            threadId: newComment.id,
            target: {
              lineNumber,
              startLineNumber,
              endLineNumber,
              side,
            },
          });
          setCommentDraft("");
        } else {
          if (!file.patch) {
            setCommentError("No diff available for this file. Cannot create comment.");
            setIsSubmittingComment(false);
            return;
          }

          const diffHunk = getDiffHunkForLine(endLineForApi, side);

          if (!diffHunk) {
            const errorMsg = showFullFile
              ? `Cannot comment on line ${endLineForApi}. This line is not part of the diff changes.`
              : `Cannot find diff hunk for line ${endLineForApi}. The line may not be part of the changes.`;
            setCommentError(errorMsg);
            setIsSubmittingComment(false);
            return;
          }

          const newComment = await api.createComment(
            repoOwner,
            repoName,
            pullNumber,
            trimmed,
            file.filename,
            endLineForApi,
            side,
            startLineForApi !== endLineForApi ? startLineForApi : undefined,
            startLineForApi !== endLineForApi ? side : undefined,
            undefined,
          );

          onCommentAdded?.(newComment);
          setActiveOverlay({
            type: "thread",
            threadId: newComment.id,
            target: {
              lineNumber,
              startLineNumber,
              endLineNumber,
              side,
            },
          });
          setCommentDraft("");
        }
      } else if (activeOverlay.type === "thread") {
        const thread = commentThreads.find(
          (t) => t.id === activeOverlay.threadId,
        );
        const parentCommentId = thread?.comments[0]?.id ?? activeOverlay.threadId;

        const newComment = await api.replyToReviewComment(
          repoOwner,
          repoName,
          pullNumber,
          parentCommentId,
          trimmed,
        );

        onCommentAdded?.(newComment);
        setCommentDraft("");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentError("Unable to submit comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [
    activeOverlay,
    canSubmitComments,
    commentDraft,
    commentThreads,
    file.filename,
    file.patch,
    getDiffHunkForLine,
    getDiffPositionForEditorLine,
    mapEditorLineToFileLine,
    onCommentAdded,
    pullNumber,
    repoName,
    repoOwner,
    showFullFile,
    token,
  ]);

  return {
    commentThreads,
    activeOverlay,
    overlayPosition,
    commentDraft,
    commentError,
    isSubmittingComment,
    canSubmitComments,
    overlayWidth,
    overlayHeight,
    resizeMode,
    activeThread,
    handleCommentDraftChange,
    handleCommentSubmit,
    handleResizeStart,
    handleOverlayTarget,
    closeOverlay,
  };
}
