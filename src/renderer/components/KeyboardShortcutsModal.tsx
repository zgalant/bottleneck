import React from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
}

const SHORTCUTS = [
  {
    category: "Navigation",
    shortcuts: [
      { keys: ["Cmd", "/"], description: "Show this keyboard shortcuts help" },
      { keys: ["Cmd", "B"], description: "Toggle sidebar" },
      { keys: ["Cmd", "Shift", "B"], description: "Toggle right panel" },
      { keys: ["Cmd", "Left Arrow"], description: "Go back to PR list" },
      { keys: ["Cmd", ","], description: "Go to settings" },
      { keys: ["Cmd", "Shift", "]"], description: "Next tab (on PR detail)" },
      { keys: ["Cmd", "Shift", "["], description: "Previous tab (on PR detail)" },
    ],
  },
  {
    category: "Search & Command",
    shortcuts: [
      { keys: ["Cmd", "K"], description: "Open command palette (actions)" },
      { keys: ["Cmd", "P"], description: "Open PR palette (navigation)" },
      { keys: ["Cmd", "O"], description: "Open URLs palette (on PR detail)" },
    ],
  },
  {
    category: "PR Actions",
    shortcuts: [
      { keys: ["Cmd", "Shift", "A"], description: "Go to PR homepage" },
      { keys: ["Cmd", "L"], description: "Add label" },
      { keys: ["Cmd", "Shift", "C"], description: "Focus comment box" },
      { keys: ["Cmd", "Shift", "H"], description: "Go to home (PR list)" },
      { keys: ["Cmd", "Shift", "N"], description: "Go to notifications" },
    ],
  },
  {
    category: "Notifications",
    shortcuts: [
      { keys: ["J"], description: "Move selection down" },
      { keys: ["K"], description: "Move selection up" },
      { keys: ["E"], description: "Mark selected as read" },
      { keys: ["Enter"], description: "Open selected notification" },
      { keys: ["O"], description: "Open selected notification" },
    ],
  },
  {
    category: "View Settings",
    shortcuts: [
      { keys: ["Cmd", "Shift", "T"], description: "Toggle theme (light/dark)" },
      { keys: ["Cmd", "Shift", "D"], description: "Toggle diff view (unified/split)" },
      { keys: ["Cmd", "Shift", "W"], description: "Toggle whitespace visibility" },
      { keys: ["Cmd", "Shift", "L"], description: "Toggle word wrap" },
    ],
  },
];

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  theme,
}: KeyboardShortcutsModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={cn(
          "rounded-lg shadow-xl max-w-5xl w-full mx-4 flex flex-col max-h-[80vh]",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            "p-6 border-b flex items-center justify-between",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <h2 className="text-2xl font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-opacity-80",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SHORTCUTS.map((section, idx) => (
              <div key={idx}>
                <h3
                  className={cn(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  )}
                >
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.shortcuts.map((shortcut, shortcutIdx) => (
                    <div key={shortcutIdx} className="flex items-start gap-3">
                      <div className="flex gap-1 flex-shrink-0 pt-0.5">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            <kbd
                              className={cn(
                                "px-2 py-1 rounded font-mono text-sm font-semibold border",
                                theme === "dark"
                                  ? "bg-gray-700 border-gray-600 text-gray-100"
                                  : "bg-gray-100 border-gray-300 text-gray-900"
                              )}
                            >
                              {key}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  theme === "dark"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                                )}
                              >
                                +
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <p
                        className={cn(
                          "text-sm pt-0.5",
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        {shortcut.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "p-4 border-t text-center text-sm",
            theme === "dark" ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"
          )}
        >
          Press <kbd className={cn(
            "px-1.5 py-0.5 rounded text-xs font-mono",
            theme === "dark"
              ? "bg-gray-700 border border-gray-600"
              : "bg-gray-100 border border-gray-300"
          )}>ESC</kbd> to close
        </div>
      </div>
    </div>
  );
}
