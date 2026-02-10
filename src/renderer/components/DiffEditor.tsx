import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PatchDiff,
  DiffLineAnnotation,
  FileDiffMetadata,
} from "@pierre/diffs/react";

import type { Comment, File } from "../services/github";
import { useUIStore } from "../stores/uiStore";
import { DiffEditorHeader } from "./diff/DiffEditorHeader";
import { CommentOverlay } from "./diff/CommentOverlay";
import { ImageDiffViewer } from "./diff/ImageDiffViewer";
import { isImageFile } from "../utils/fileType";
import { useDiffModel } from "./diff/useDiffModel";
import { useSimpleCommentManager } from "./diff/useSimpleCommentManager";
import { getLanguageFromFilename } from "./diff/commentUtils";

interface DiffEditorProps {
  file: File;
  originalContent?: string;
  modifiedContent?: string;
  originalBinaryContent?: string | null;
  modifiedBinaryContent?: string | null;
  isBinary?: boolean;
  comments: Comment[];
  onMarkViewed: () => void;
  isViewed: boolean;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  token: string | null;
  currentUser: { login: string; avatar_url?: string } | null;
  onCommentAdded?: (comment: Comment) => void;
  orgName?: string;
}

interface CommentMetadata {
  threadId: number;
  side: "LEFT" | "RIGHT";
  commentCount: number;
}

export function DiffEditor({
  file,
  originalContent,
  modifiedContent,
  originalBinaryContent,
  modifiedBinaryContent,
  isBinary = false,
  comments,
  onMarkViewed,
  isViewed,
  repoOwner,
  repoName,
  pullNumber,
  token,
  currentUser,
  onCommentAdded,
  orgName,
}: DiffEditorProps) {
  const {
    diffView,
    showWhitespace,
    wordWrap,
    toggleDiffView,
    toggleWhitespace,
    toggleWordWrap,
    theme,
  } = useUIStore();

  const containerRef = useRef<HTMLDivElement>(null);

  const hasFullContent = !(originalContent === undefined && modifiedContent === undefined);
  const [showFullFile, setShowFullFile] = useState(false);
  const [hideUnchangedRegions, setHideUnchangedRegions] = useState(false);

  // Reset to diff view when switching files
  useEffect(() => {
    setShowFullFile(false);
  }, [file.filename]);

  const diffModel = useDiffModel(file, showFullFile);

  const commentManager = useSimpleCommentManager({
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
  });

  const isRecognizedImage = useMemo(
    () => isImageFile(file.filename),
    [file.filename],
  );
  const isImageDiff = (isBinary || isRecognizedImage) && isRecognizedImage;

  // Build the patch string for the diff viewer
  const patchContent = useMemo(() => {
    if (!file.patch) {
      return "";
    }

    // Construct a full unified diff header for the patch
    const oldName = file.previous_filename || file.filename;
    const newName = file.filename;

    let header = `diff --git a/${oldName} b/${newName}\n`;

    if (file.status === "added") {
      header += `new file mode 100644\n`;
      header += `--- /dev/null\n`;
      header += `+++ b/${newName}\n`;
    } else if (file.status === "removed") {
      header += `deleted file mode 100644\n`;
      header += `--- a/${oldName}\n`;
      header += `+++ /dev/null\n`;
    } else {
      header += `--- a/${oldName}\n`;
      header += `+++ b/${newName}\n`;
    }

    return header + file.patch;
  }, [file.patch, file.filename, file.previous_filename, file.status]);

  // Build line annotations from comment threads for the diff viewer
  // Use originalLineNumber (the actual file line) instead of lineNumber (which may be mapped to editor rows)
  const lineAnnotations = useMemo<DiffLineAnnotation<CommentMetadata>[]>(() => {
    return commentManager.commentThreads.map((thread) => ({
      side: thread.side === "LEFT" ? "deletions" : "additions",
      lineNumber: thread.originalLineNumber,
      metadata: {
        threadId: thread.id,
        side: thread.side,
        commentCount: thread.comments.length,
      },
    }));
  }, [commentManager.commentThreads]);

  // Determine the language for syntax highlighting
  const language = getLanguageFromFilename(file.filename);

  const handleToggleFullFile = useCallback(() => {
    if (file.status !== "modified" || !hasFullContent) return;
    setShowFullFile((prev) => !prev);
  }, [file.status, hasFullContent]);

  const handleToggleHideUnchanged = useCallback(() => {
    setHideUnchangedRegions((prev) => !prev);
  }, []);

  // Handle line click for comments
  const handleLineClick = useCallback((lineNumber: number, side: "deletions" | "additions") => {
    const commentSide = side === "deletions" ? "LEFT" : "RIGHT";
    commentManager.handleOverlayTarget(lineNumber, commentSide);
  }, [commentManager]);

  // Check if we have valid content to display
  const hasValidPatch = Boolean(file.patch && file.patch.trim());

  // For full file view, we'd need to show the entire file content
  // This is a simplified version - full file view would need the actual file contents
  const showFullFileContent = showFullFile && hasFullContent && originalContent !== undefined && modifiedContent !== undefined;

  // Build full file diff if needed
  const fullFilePatch = useMemo(() => {
    if (!showFullFileContent) return "";

    const oldName = file.previous_filename || file.filename;
    const newName = file.filename;

    let header = `diff --git a/${oldName} b/${newName}\n`;
    header += `--- a/${oldName}\n`;
    header += `+++ b/${newName}\n`;

    // Create a unified diff from the full file contents
    const oldLines = (originalContent || "").split("\n");
    const newLines = (modifiedContent || "").split("\n");

    // Simple diff: show all as context with changes
    // This is a simplified approach - for real full file view,
    // we'd need proper diff algorithm
    const maxLines = Math.max(oldLines.length, newLines.length);
    let hunk = `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine && oldLine !== undefined) {
        hunk += ` ${oldLine}\n`;
      } else {
        if (oldLine !== undefined) {
          hunk += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          hunk += `+${newLine}\n`;
        }
      }
    }

    return header + hunk;
  }, [showFullFileContent, originalContent, modifiedContent, file.filename, file.previous_filename]);

  const effectivePatch = showFullFileContent ? fullFilePatch : patchContent;

  return (
    <div className="flex flex-col h-full">
      <DiffEditorHeader
        file={file}
        theme={theme}
        diffView={diffView}
        showWhitespace={showWhitespace}
        wordWrap={wordWrap}
        showFullFile={showFullFile}
        hideUnchangedRegions={hideUnchangedRegions}
        isViewed={isViewed}
        canShowFullFile={hasFullContent}
        onToggleDiffView={toggleDiffView}
        onToggleWhitespace={toggleWhitespace}
        onToggleWordWrap={toggleWordWrap}
        onToggleFullFile={handleToggleFullFile}
        onToggleHideUnchanged={handleToggleHideUnchanged}
        onMarkViewed={onMarkViewed}
      />

      <div className="flex-1 relative overflow-auto" ref={containerRef}>
        {isImageDiff ? (
          <ImageDiffViewer
            file={file}
            originalSrc={originalBinaryContent}
            modifiedSrc={modifiedBinaryContent}
            diffView={diffView}
            theme={theme}
          />
        ) : hasValidPatch || showFullFileContent ? (
          <PatchDiff<CommentMetadata>
            key={`${file.filename}-${showFullFile}`}
            patch={effectivePatch}
            options={{
              diffStyle: diffView === "split" ? "split" : "unified",
              theme: {
                dark: "pierre-dark",
                light: "pierre-light",
              },
              themeType: theme === "dark" ? "dark" : "light",
              overflow: wordWrap ? "wrap" : "scroll",
              diffIndicators: "classic",
              disableBackground: false,
              lineDiffType: "word",
              disableFileHeader: true,
              hunkSeparators: "line-info",
              enableHoverUtility: true,
              onLineNumberClick: (props) => {
                const side = props.annotationSide;
                handleLineClick(props.lineNumber, side);
              },
            }}
            lineAnnotations={lineAnnotations}
            renderAnnotation={(annotation) => (
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-blue-500/20 rounded"
                onClick={() => handleLineClick(annotation.lineNumber, annotation.side)}
              >
                <span className="text-blue-500">
                  {annotation.metadata?.commentCount || 1} comment{(annotation.metadata?.commentCount || 1) > 1 ? "s" : ""}
                </span>
              </div>
            )}
            renderHoverUtility={(getHoveredLine) => {
              const hoveredLine = getHoveredLine();
              if (!hoveredLine) return null;

              return (
                <button
                  className="flex items-center justify-center w-4 h-4 text-[10px] leading-none bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    handleLineClick(hoveredLine.lineNumber, hoveredLine.side);
                  }}
                >
                  +
                </button>
              );
            }}
            className="h-full"
            style={{
              fontSize: "12px",
              lineHeight: "18px",
              // Force diff background colors via CSS custom properties
              "--diffs-bg-addition-override": theme === "dark" ? "rgba(35, 134, 54, 0.15)" : "#dafbe1",
              "--diffs-bg-addition-number-override": theme === "dark" ? "rgba(35, 134, 54, 0.25)" : "#ccffd8",
              "--diffs-bg-deletion-override": theme === "dark" ? "rgba(248, 81, 73, 0.15)" : "#ffebe9",
              "--diffs-bg-deletion-number-override": theme === "dark" ? "rgba(248, 81, 73, 0.25)" : "#ffd7d5",
              "--diffs-addition-color-override": theme === "dark" ? "#3fb950" : "#1a7f37",
              "--diffs-deletion-color-override": theme === "dark" ? "#f85149" : "#cf222e",
            } as React.CSSProperties}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">
              {file.status === "added" && !file.patch
                ? "New empty file"
                : file.status === "removed" && !file.patch
                  ? "File deleted"
                  : "No changes to display"}
            </div>
          </div>
        )}

        {!isImageDiff &&
          commentManager.activeOverlay &&
          commentManager.overlayPosition && (
            <CommentOverlay
              overlay={commentManager.activeOverlay}
              position={commentManager.overlayPosition}
              theme={theme}
              canSubmitComments={commentManager.canSubmitComments}
              currentUser={currentUser}
              activeThread={commentManager.activeThread}
              commentDraft={commentManager.commentDraft}
              commentError={commentManager.commentError}
              isSubmittingComment={commentManager.isSubmittingComment}
              overlayWidth={commentManager.overlayWidth}
              overlayHeight={commentManager.overlayHeight}
              resizeMode={commentManager.resizeMode}
              onCommentDraftChange={commentManager.handleCommentDraftChange}
              onClose={commentManager.closeOverlay}
              onSubmit={commentManager.handleCommentSubmit}
              onResizeStart={commentManager.handleResizeStart}
              orgName={orgName}
            />
          )}
      </div>
    </div>
  );
}
