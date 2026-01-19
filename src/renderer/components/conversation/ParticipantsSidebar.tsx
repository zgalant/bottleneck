import { Users, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { ParticipantStat } from "./types";
import { ParticipantCard } from "./ParticipantCard";
import { AddReviewerDialog } from "./AddReviewerDialog";
import { useOrgStore } from "../../stores/orgStore";
import { useUIStore } from "../../stores/uiStore";

interface ParticipantsSidebarProps {
  participants: ParticipantStat[];
  theme: "light" | "dark";
  owner?: string;
  repo?: string;
  prNumber?: number;
  prAuthor?: string;
  currentUser?: string;
  onReviewerAdded?: () => void;
}

export function ParticipantsSidebar({
  participants,
  theme,
  owner,
  repo,
  prNumber,
  prAuthor,
  currentUser,
  onReviewerAdded,
}: ParticipantsSidebarProps) {
  const { addReviewersDialogOpen, setAddReviewersDialogOpen } = useUIStore();
  const [requestingReviewers, setRequestingReviewers] = useState<
    Set<string>
  >(new Set());
  const [orgMembers, setOrgMembers] = useState<
    Array<{ login: string; avatar_url: string }>
  >([]);
  const [isLoadingOrgMembers, setIsLoadingOrgMembers] = useState(false);

  const requestReviewerAsync = async (username: string) => {
    if (!owner || !repo || !prNumber) {
      throw new Error("Missing PR context for requesting review");
    }

    const { GitHubAPI } = await import("../../services/github");
    const { useAuthStore } = await import("../../stores/authStore");
    const { usePRStore } = await import("../../stores/prStore");

    const { token } = useAuthStore.getState();
    const api = new GitHubAPI(token);

    // Make API call to request reviewer
    const response = await api.requestReviewers(owner, repo, prNumber, [
      username,
    ]);

    // Update the store
    const prStore = usePRStore.getState();
    const key = `${owner}/${repo}#${prNumber}`;
    const currentPR = prStore.pullRequests.get(key);

    if (currentPR) {
      const updatedPR = {
        ...currentPR,
        requested_reviewers: response.requested_reviewers || [
          ...currentPR.requested_reviewers,
          {
            login: username,
            avatar_url: participants.find((p) => p.user.login === username)
              ?.user.avatar_url,
          },
        ],
      };
      prStore.updatePR(updatedPR);
    }

    onReviewerAdded?.();
  };

  const handleRequestReview = async (username: string) => {
    setRequestingReviewers((prev) => new Set(prev).add(username));

    try {
      await requestReviewerAsync(username);
    } catch (error) {
      const err = error as any;
      const message = err?.message || String(error);
      
      // Only log as error if it's not a known GitHub API constraint
      if (message.includes("Review cannot be requested from pull request author")) {
        console.warn("Cannot request review from author:", username);
      } else {
        console.error("Failed to request reviewer:", error);
      }
    } finally {
      setRequestingReviewers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  // Separate requested reviewers from other participants
  const requestedReviewers = participants.filter(
    (p) => p.isRequestedReviewer,
  );
  const otherParticipants = participants.filter(
    (p) => !p.isRequestedReviewer,
  );

  const canRequestReview = !!(owner && repo && prNumber);

  // Fetch org members when dialog opens (cached by orgStore)
  useEffect(() => {
    if (addReviewersDialogOpen && owner) {
      setIsLoadingOrgMembers(true);
      (async () => {
        try {
          const { fetchOrgMembers } = useOrgStore.getState();
          const members = await fetchOrgMembers(owner);
          setOrgMembers(members);
        } catch (error) {
          console.error("Failed to fetch org members:", error);
        } finally {
          setIsLoadingOrgMembers(false);
        }
      })();
    }
  }, [addReviewersDialogOpen, owner]);

  return (
    <div
      className={cn(
        "w-80 border-l overflow-y-auto",
        theme === "dark"
          ? "bg-gray-900 border-gray-700"
          : "bg-gray-50 border-gray-200",
      )}
    >
      <div className="p-4 space-y-6">
        {/* Header with Add Reviewer Button */}
        <div className="flex items-center justify-between mb-2">
          <h3
            className={cn(
              "text-sm font-semibold flex items-center",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            <Users className="w-4 h-4 mr-2" />
            Participants
          </h3>
          {canRequestReview && (
            <button
              onClick={() => setAddReviewersDialogOpen(true)}
              className={cn(
                "p-1 rounded transition-colors",
                theme === "dark"
                  ? "hover:bg-gray-800 text-gray-400 hover:text-blue-400"
                  : "hover:bg-gray-200 text-gray-500 hover:text-blue-600",
              )}
              title="Add reviewer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Requested Reviewers Section */}
        {requestedReviewers.length > 0 && (
          <div>
            <h4
              className={cn(
                "text-xs font-semibold mb-3 uppercase",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Review Requests ({requestedReviewers.length})
            </h4>

            <div className="space-y-3">
              {requestedReviewers.map((participant) => (
                <ParticipantCard
                  key={participant.user.login}
                  participant={participant}
                  theme={theme}
                  canRequestReview={false}
                  isAuthor={participant.user.login === prAuthor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Participants Section */}
        {otherParticipants.length > 0 && (
          <div>
            <h4
              className={cn(
                "text-xs font-semibold mb-3 uppercase",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Other Participants ({otherParticipants.length})
            </h4>

            <div className="space-y-3">
              {otherParticipants.map((participant) => (
                <ParticipantCard
                  key={participant.user.login}
                  participant={participant}
                  theme={theme}
                  canRequestReview={canRequestReview}
                  onRequestReview={handleRequestReview}
                  isRequestingReview={requestingReviewers.has(
                    participant.user.login,
                  )}
                  isAuthor={participant.user.login === prAuthor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {participants.length === 0 && (
          <div
            className={cn(
              "text-xs text-center py-4",
              theme === "dark" ? "text-gray-500" : "text-gray-400",
            )}
          >
            No participants yet
          </div>
        )}
      </div>

      {/* Add Reviewer Dialog */}
      <AddReviewerDialog
        isOpen={addReviewersDialogOpen}
        onClose={() => setAddReviewersDialogOpen(false)}
        onSelect={requestReviewerAsync}
        participants={participants}
        orgMembers={orgMembers}
        isLoadingOrgMembers={isLoadingOrgMembers}
        theme={theme}
        prAuthor={prAuthor}
        requestedReviewers={requestedReviewers.map((p) => p.user.login)}
      />
    </div>
  );
}
