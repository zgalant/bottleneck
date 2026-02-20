import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Pencil } from "lucide-react";
import { cn } from "../../utils/cn";
import { Markdown } from "../Markdown";
import { PullRequest } from "../../services/github";
import { MentionTypeahead } from "../MentionTypeahead";
import { useOrgStore } from "../../stores/orgStore";

interface PRDescriptionProps {
  pr: PullRequest;
  theme: "light" | "dark";
  onUpdateDescription?: (body: string) => Promise<void>;
}

export function PRDescription({ pr, theme, onUpdateDescription }: PRDescriptionProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(pr.body || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [orgMembers, setOrgMembers] = useState<Array<{ login: string; avatar_url: string; name?: string }>>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetchOrgMembers = useOrgStore((state) => state.fetchOrgMembers);

  const canEdit = !!onUpdateDescription;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // Fetch org members for mentions
  useEffect(() => {
    if (isEditing) {
      const org = pr.base.repo.owner.login;
      fetchOrgMembers(org).then((members) => {
        setOrgMembers(members);
      });
    }
  }, [isEditing, pr.base.repo.owner.login, fetchOrgMembers]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  // Listen for edit description event from command palette
  useEffect(() => {
    const handleEditDescription = () => {
      if (canEdit) {
        setEditText(pr.body || "");
        setIsEditing(true);
      }
    };

    window.addEventListener("pr-action:edit-description", handleEditDescription);
    return () => {
      window.removeEventListener("pr-action:edit-description", handleEditDescription);
    };
  }, [canEdit, pr.body]);

  // Filter mention candidates based on query
  const filteredMentionCandidates = mentionQuery
    ? orgMembers.filter((candidate) => {
        const query = mentionQuery.toLowerCase();
        return (
          candidate.login.toLowerCase().includes(query) ||
          (candidate.name?.toLowerCase().includes(query) ?? false)
        );
      })
    : [];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setEditText(text);
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
    const text = editText;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Replace @query with @login
      const before = text.substring(0, lastAtIndex + 1);
      const after = text.substring(cursorPosition);
      const newText = `${before}${login} ${after}`;
      setEditText(newText);

      // Reset mention state
      setShowMentionMenu(false);
      setMentionQuery("");

      // Set cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + login.length + 2;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
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

    // Save with Cmd+Enter
    if (e.key === "Enter" && e.metaKey && !isSaving) {
      e.preventDefault();
      handleSave();
    }

    // Cancel with Escape
    if (e.key === "Escape" && !showMentionMenu) {
      handleCancel();
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setEditText(pr.body || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(pr.body || "");
    setShowMentionMenu(false);
    setMentionQuery("");
  };

  const handleSave = async () => {
    if (!onUpdateDescription) return;

    setIsSaving(true);
    try {
      await onUpdateDescription(editText);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update description:", error);
      alert("Failed to update description. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-start space-x-3">
        <img
          src={pr.user.avatar_url}
          alt={pr.user.login}
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{pr.user.login}</span>
              <span
                className={cn(
                  "text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                opened this pull request{" "}
                {formatDistanceToNow(new Date(pr.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {canEdit && !isEditing && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                      : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
                  )}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div
                    className={cn(
                      "absolute right-0 mt-1 py-1 rounded shadow-lg z-10 min-w-[120px]",
                      theme === "dark"
                        ? "bg-gray-700 border border-gray-600"
                        : "bg-white border border-gray-200",
                    )}
                  >
                    <button
                      onClick={handleEdit}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-1.5 w-full text-left text-sm transition-colors",
                        theme === "dark"
                          ? "hover:bg-gray-600"
                          : "hover:bg-gray-100",
                      )}
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="relative">
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
                value={editText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                className="input w-full h-[36rem] resize-none mb-3 font-mono text-sm"
                placeholder="Write a description... (@ to mention)"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-100",
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary text-sm"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "overflow-hidden",
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              )}
            >
              {pr.body ? (
                <Markdown content={pr.body} variant="full" />
              ) : (
                <em
                  className={cn(
                    theme === "dark" ? "text-gray-500" : "text-gray-600",
                  )}
                >
                  No description provided
                </em>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
