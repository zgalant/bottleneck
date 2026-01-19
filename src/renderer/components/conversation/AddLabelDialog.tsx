import { X, Loader2, Plus, ChevronDown, Check } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { getLabelColors } from "../../utils/labelColors";
import { useUIStore } from "../../stores/uiStore";

interface Label {
  name: string;
  color: string;
  description?: string | null;
}

interface AddLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (labelName: string) => Promise<void>;
  availableLabels: Label[];
  selectedLabels?: string[];
  theme: "light" | "dark";
  isLoadingLabels?: boolean;
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

export function AddLabelDialog({
  isOpen,
  onClose,
  onSelect,
  availableLabels,
  selectedLabels = [],
  theme,
  isLoadingLabels = false,
}: AddLabelDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelName, setSelectedLabelName] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort with fuzzy search
  const filteredLabels = useMemo(() => {
    const selectedSet = new Set(selectedLabels);

    if (!searchQuery.trim()) {
      // Sort with selected labels first, then unselected
      return availableLabels.sort((a, b) => {
        const aSelected = selectedSet.has(a.name);
        const bSelected = selectedSet.has(b.name);
        if (aSelected !== bSelected) {
          return aSelected ? -1 : 1; // Selected labels first
        }
        return a.name.localeCompare(b.name);
      });
    }

    // Score and filter based on fuzzy match
    const scored = availableLabels
      .map((label) => ({
        ...label,
        score: fuzzyMatch(searchQuery, label.name),
        isSelected: selectedSet.has(label.name),
      }))
      .filter((l) => l.score >= 0)
      .sort((a, b) => {
        // Selected labels first
        if (a.isSelected !== b.isSelected) {
          return a.isSelected ? -1 : 1;
        }
        // Then sort by score, then alphabetically
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.name.localeCompare(b.name);
      });

    return scored;
  }, [availableLabels, searchQuery, selectedLabels]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, filteredLabels]);

  const handleSelect = async (labelName: string) => {
    setIsLoading(true);
    setSelectedLabelName(labelName);
    try {
      await onSelect(labelName);
      setSearchQuery("");
      setSelectedLabelName(null);
      onClose();
    } catch (error) {
      console.error("Failed to add label:", error);
      setSelectedLabelName(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredLabels.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredLabels.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredLabels.length) {
          handleSelect(filteredLabels[highlightedIndex].name);
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
          <h3 className="text-lg font-semibold">Add Label</h3>
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
            placeholder="Search labels... (↑↓ to navigate, Enter to select, Esc to close)"
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
          {filteredLabels.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center py-8",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}
            >
              <p className="text-sm">
                {availableLabels.length === 0
                  ? "No labels available"
                  : "No matching labels"}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "inherit" }}>
              {filteredLabels.map((label, index) => {
                const isSelected = selectedLabels.includes(label.name);
                const { bgColor, textColor } = getLabelColors(label.color, theme);

                return (
                  <button
                    key={label.name}
                    onClick={() => !isSelected && handleSelect(label.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    disabled={isLoading || isSelected}
                    className={cn(
                      "w-full px-4 py-3 flex items-center space-x-3 transition-colors text-left",
                      isLoading || isSelected
                        ? "opacity-60 cursor-not-allowed"
                        : highlightedIndex === index
                          ? theme === "dark"
                            ? "bg-blue-600 bg-opacity-30"
                            : "bg-blue-100"
                          : theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-50",
                      selectedLabelName === label.name &&
                        (theme === "dark" ? "bg-gray-700" : "bg-gray-100"),
                      isSelected && (theme === "dark" ? "bg-gray-700 bg-opacity-50" : "bg-gray-50")
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `#${label.color}`,
                      }}
                      title="Label color"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {label.name}
                      </p>
                      {label.description && (
                        <p
                          className={cn(
                            "text-xs truncate",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500"
                          )}
                        >
                          {label.description}
                        </p>
                      )}
                    </div>
                    {selectedLabelName === label.name && isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    ) : isSelected ? (
                      <Check className="w-4 h-4 flex-shrink-0 text-green-500" />
                    ) : highlightedIndex === index ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
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
          {isLoadingLabels ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-current rounded-full animate-pulse" />
              <span>Loading labels...</span>
            </div>
          ) : (
            <>{filteredLabels.length} available label{filteredLabels.length !== 1 ? "s" : ""}</>
          )}
        </div>
      </div>
    </div>
  );
}
