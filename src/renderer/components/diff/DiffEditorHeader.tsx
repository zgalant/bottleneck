import { FC, useEffect, useState } from "react";
import {
  Eye,
  Columns,
  FileText,
  Check,
  WrapText,
  WholeWord,
  FilePlus,
  FileMinus,
  FileEdit,
  Minimize2,
  Maximize2,
  Copy,
} from "lucide-react";
import { File } from "../../services/github";
import { cn } from "../../utils/cn";
import { isImageFile } from "../../utils/fileType";

interface DiffEditorHeaderProps {
  file: File;
  theme: string;
  diffView: "unified" | "split";
  showWhitespace: boolean;
  wordWrap: boolean;
  showFullFile: boolean;
  hideUnchangedRegions: boolean;
  isViewed: boolean;
  canShowFullFile: boolean;
  onToggleDiffView: () => void;
  onToggleWhitespace: () => void;
  onToggleWordWrap: () => void;
  onToggleFullFile: () => void;
  onToggleHideUnchanged: () => void;
  onMarkViewed: () => void;
}

export const DiffEditorHeader: FC<DiffEditorHeaderProps> = ({
  file,
  theme,
  diffView,
  showWhitespace,
  wordWrap,
  showFullFile,
  hideUnchangedRegions,
  isViewed,
  canShowFullFile,
  onToggleDiffView,
  onToggleWhitespace,
  onToggleWordWrap,
  onToggleFullFile,
  onToggleHideUnchanged,
  onMarkViewed,
}) => {
  const [copied, setCopied] = useState(false);

  const showCopiedFeedback = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyFilename = async () => {
    try {
      await navigator.clipboard.writeText(file.filename);
      showCopiedFeedback();
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    const onCopyFilename = () => showCopiedFeedback();
    window.addEventListener("pr-action:copy-filename", onCopyFilename);
    return () => window.removeEventListener("pr-action:copy-filename", onCopyFilename);
  }, []);

  const isDark = theme === "dark";
  const fullFileTitle = canShowFullFile
    ? showFullFile
      ? "Show diff"
      : "Show full file"
    : "Full file content not available";
  const isImage = isImageFile(file.filename);
  const hasNoLineChanges =
    file.additions === 0 && file.deletions === 0;

  return (
    <div
      className={cn(
        "py-2 px-4 flex items-center justify-between border-b",
        isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-300",
      )}
    >
      <div className="flex items-center space-x-3">
        <h3 className="font-mono text-sm font-semibold flex items-center gap-2">
          {file.status === "added" && (
            <FilePlus className="w-4 h-4 text-green-600" />
          )}
          {file.status === "removed" && (
            <FileMinus className="w-4 h-4 text-red-600" />
          )}
          {file.status === "modified" && (
            <FileEdit className="w-4 h-4 text-orange-500" />
          )}
          <span className={isDark ? "text-gray-100" : "text-gray-900"}>
            {file.filename}
          </span>
          <button
            onClick={handleCopyFilename}
            className="btn btn-ghost p-0.5"
            title="Copy filename"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </h3>
        <div className="flex items-center space-x-2 text-xs">
          {file.status === "added" ? (
            <span className={isDark ? "text-green-400" : "text-green-600"}>
              {file.additions === 0 && file.deletions === 0
                ? "New file"
                : `+${file.additions}`}
            </span>
          ) : file.status === "removed" ? (
            <span className={isDark ? "text-red-400" : "text-red-600"}>
              -{file.deletions}
            </span>
          ) : (
            <>
              {isImage && hasNoLineChanges ? (
                <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>
                  Changed
                </span>
              ) : (
                <>
                  <span className={isDark ? "text-green-400" : "text-green-600"}>
                    +{file.additions}
                  </span>
                  <span className={isDark ? "text-red-400" : "text-red-600"}>
                    -{file.deletions}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        {file.status === "modified" && !isImage && !hasNoLineChanges && (
          <span className={isDark ? "text-gray-400" : "text-gray-600"}>
            {file.filename.split(".").pop()?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {file.status !== "added" && (
          <button
            onClick={onToggleDiffView}
            className="btn btn-ghost p-1 text-xs"
            title={
              diffView === "unified"
                ? "Switch to split view"
                : "Switch to unified view"
            }
          >
            {diffView === "unified" ? (
              <Columns className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={onToggleWhitespace}
          className={cn(
            "btn btn-ghost p-1 text-xs",
            showWhitespace && (isDark ? "bg-gray-700" : "bg-gray-200"),
          )}
          title="Toggle whitespace"
        >
          W
        </button>

        {file.status === "modified" && (
          <>
            <button
              onClick={onToggleFullFile}
              className={cn(
                "btn btn-ghost px-2 py-1 text-xs flex items-center gap-1",
                showFullFile && (isDark ? "bg-gray-700" : "bg-gray-200"),
                !canShowFullFile && "opacity-50 cursor-not-allowed",
              )}
              disabled={!canShowFullFile}
              title={fullFileTitle}
            >
              <WholeWord className="w-4 h-4" />
              <span>{showFullFile ? "Diff" : "Full"}</span>
            </button>

            {showFullFile && (
              <button
                onClick={onToggleHideUnchanged}
                className={cn(
                  "btn btn-ghost p-1 text-xs",
                  hideUnchangedRegions && (isDark ? "bg-gray-700" : "bg-gray-200"),
                )}
                title={hideUnchangedRegions ? "Show all lines" : "Hide unchanged lines"}
              >
                {hideUnchangedRegions ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </>
        )}

        <button
          onClick={onToggleWordWrap}
          className={cn(
            "btn btn-ghost p-1 text-sm",
            wordWrap && (isDark ? "bg-gray-700" : "bg-gray-200"),
          )}
          title="Toggle word wrap"
        >
          <WrapText className="w-4 h-4" />
        </button>

        <button
          onClick={onMarkViewed}
          className="btn btn-ghost p-1 text-sm flex items-center"
          title={isViewed ? "Mark as not viewed" : "Mark as viewed"}
        >
          {isViewed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
