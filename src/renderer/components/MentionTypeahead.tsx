import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

export interface MentionCandidate {
  login: string;
  avatar_url: string;
  name?: string | null;
}

interface MentionTypeaheadProps {
  value: string;
  candidates: MentionCandidate[];
  onMention: (login: string) => void;
  theme: "light" | "dark";
  isOpen: boolean;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  dropDown?: boolean;
}

export function MentionTypeahead({
  value,
  candidates,
  onMention,
  theme,
  isOpen,
  selectedIndex,
  onSelectedIndexChange,
  dropDown = false,
}: MentionTypeaheadProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (!isOpen || candidates.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className={cn(
        dropDown
          ? "absolute top-full mt-1 left-0 w-64 rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto"
          : "absolute bottom-full mb-1 left-0 w-64 rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200",
      )}
    >
      {candidates.map((candidate, index) => (
        <button
          key={candidate.login}
          ref={index === selectedIndex ? selectedItemRef : null}
          onClick={() => onMention(candidate.login)}
          className={cn(
            "w-full px-4 py-2 text-left flex items-center gap-3 cursor-pointer transition-colors",
            index === selectedIndex
              ? theme === "dark"
                ? "bg-gray-700"
                : "bg-gray-100"
              : theme === "dark"
                ? "hover:bg-gray-700"
                : "hover:bg-gray-50",
          )}
        >
          <img
            src={candidate.avatar_url}
            alt={candidate.login}
            className="w-6 h-6 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {candidate.name || candidate.login}
            </div>
            {candidate.name && (
              <div
                className={cn(
                  "text-xs truncate",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                @{candidate.login}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
