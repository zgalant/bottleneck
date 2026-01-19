import { X, Loader2, Plus, ChevronDown } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { ParticipantStat } from "./types";

interface AddReviewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (username: string) => Promise<void>;
  participants: ParticipantStat[];
  orgMembers?: Array<{ login: string; avatar_url: string }>;
  theme: "light" | "dark";
  prAuthor?: string;
  requestedReviewers?: string[];
  isLoadingOrgMembers?: boolean;
}

// Fuzzy search function for better typeahead matching
function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  if (!q) return 0;
  if (t === q) return 1000; // Exact match is best
  if (t.startsWith(q)) return 100; // Prefix match is very good
  
  let score = 0;
  let queryIdx = 0;
  
  for (let i = 0; i < t.length && queryIdx < q.length; i++) {
    if (t[i] === q[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }
  
  return queryIdx === q.length ? score : -1; // Return -1 if not all chars matched
}

export function AddReviewerDialog({
  isOpen,
  onClose,
  onSelect,
  participants,
  orgMembers = [],
  theme,
  prAuthor,
  requestedReviewers = [],
  isLoadingOrgMembers = false,
}: AddReviewerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Combine participants and org members into a unified list
  const allReviewerCandidates = useMemo(() => {
    const seen = new Set<string>();
    const candidates: Array<ParticipantStat & { isFromOrg?: boolean }> = [];

    // Add participants first (they're more relevant)
    participants.forEach((p) => {
      if (
        !p.isBot &&
        p.user.login !== prAuthor &&
        !requestedReviewers.includes(p.user.login)
      ) {
        candidates.push(p);
        seen.add(p.user.login);
      }
    });

    // Add org members if they're not already in participants
    orgMembers.forEach((member) => {
      if (
        !seen.has(member.login) &&
        member.login !== prAuthor &&
        !requestedReviewers.includes(member.login)
      ) {
        candidates.push({
          user: member,
          role: "Organization Member",
          comments: 0,
          approvals: 0,
          changesRequested: 0,
          reviewComments: 0,
          isFromOrg: true,
        });
        seen.add(member.login);
      }
    });

    return candidates;
  }, [participants, orgMembers, prAuthor, requestedReviewers]);

  // Filter and sort with fuzzy search
  const availableReviewers = useMemo(() => {
    if (!searchQuery.trim()) {
      return allReviewerCandidates.sort((a, b) => {
        // Participants come before org members
        if (a.isFromOrg !== b.isFromOrg) {
          return a.isFromOrg ? 1 : -1;
        }
        return a.user.login.localeCompare(b.user.login);
      });
    }

    // Score and filter based on fuzzy match
    const scored = allReviewerCandidates
      .map((p) => ({
        ...p,
        score: fuzzyMatch(searchQuery, p.user.login),
      }))
      .filter((p) => p.score >= 0)
      .sort((a, b) => {
        // Sort by score first
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Then participants before org members
        if (a.isFromOrg !== b.isFromOrg) {
          return a.isFromOrg ? 1 : -1;
        }
        // Finally alphabetically
        return a.user.login.localeCompare(b.user.login);
      });

    return scored;
  }, [allReviewerCandidates, searchQuery]);

  // Reset highlighted index when search query changes or availableReviewers changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, availableReviewers]);

  const handleSelect = async (username: string) => {
    setIsLoading(true);
    setSelectedUsername(username);
    try {
      await onSelect(username);
      setSearchQuery("");
      setSelectedUsername(null);
      onClose();
    } catch (error) {
      console.error("Failed to add reviewer:", error);
      setSelectedUsername(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (availableReviewers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < availableReviewers.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < availableReviewers.length) {
          handleSelect(availableReviewers[highlightedIndex].user.login);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const buttons = listRef.current.querySelectorAll("button");
      if (buttons[highlightedIndex]) {
        buttons[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "rounded-lg shadow-xl w-full max-w-md mx-4",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "p-4 border-b flex items-center justify-between",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <h3 className="text-lg font-semibold">Request Review</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "p-1 rounded transition-colors",
              isLoading
                ? "opacity-50 cursor-not-allowed"
                : theme === "dark"
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: "inherit" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search participant... (↑↓ to navigate, Enter to select, Esc to close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={cn(
              "w-full px-3 py-2 rounded-md border text-sm",
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500",
              "focus:outline-none focus:ring-1 focus:ring-blue-500",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        {/* List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {availableReviewers.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center py-8",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}
            >
              <p className="text-sm">
                {participants.length === 0
                  ? "No participants in this PR"
                  : "No available reviewers"}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "inherit" }}>
              {availableReviewers.map((participant, index) => (
                <button
                  key={participant.user.login}
                  onClick={() => handleSelect(participant.user.login)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 flex items-center space-x-3 transition-colors text-left",
                    isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : highlightedIndex === index
                        ? theme === "dark"
                          ? "bg-blue-600 bg-opacity-30"
                          : "bg-blue-100"
                        : theme === "dark"
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-50",
                    selectedUsername === participant.user.login &&
                      (theme === "dark" ? "bg-gray-700" : "bg-gray-100")
                  )}
                >
                  <img
                    src={participant.user.avatar_url}
                    alt={participant.user.login}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {participant.user.login}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        participant.isFromOrg
                          ? theme === "dark"
                            ? "text-blue-400"
                            : "text-blue-600"
                          : theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                      )}
                    >
                      {participant.role}
                      {participant.isFromOrg && (
                        <span className="ml-1">• From Organization</span>
                      )}
                    </p>
                  </div>
                  {selectedUsername === participant.user.login && isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  ) : highlightedIndex === index ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "p-4 border-t text-xs text-center",
            theme === "dark"
              ? "border-gray-700 text-gray-400"
              : "border-gray-200 text-gray-500"
          )}
        >
          {isLoadingOrgMembers ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-current rounded-full animate-pulse" />
              <span>Loading organization members...</span>
            </div>
          ) : (
            <>
              {availableReviewers.length} available reviewer
              {availableReviewers.length !== 1 ? "s" : ""}
              {orgMembers && orgMembers.length > 0 && (
                <span className="ml-2">
                  ({participants.filter((p) => !p.isBot && p.user.login !== prAuthor).length} participants
                  {" + " + orgMembers.filter((m) => !participants.some((p) => p.user.login === m.login) && m.login !== prAuthor).length} org members)
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
