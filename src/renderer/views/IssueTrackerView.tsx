import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileEdit, Eye, MessageSquare, CheckCircle, GitPullRequest, Settings, ExternalLink } from "lucide-react";
import { useLinearIssueStore } from "../stores/linearIssueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { useSettingsStore } from "../stores/settingsStore";
import WelcomeView from "./WelcomeView";
import { LinearIssue } from "../services/linear";
import { LinearIssueCard } from "./IssueTrackerView/components/LinearIssueCard";
import { cn } from "../utils/cn";

type KanbanColumn = "draft" | "ready_for_review" | "in_review" | "approved";

interface KanbanColumnConfig {
  id: KanbanColumn;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "draft",
    title: "Draft",
    description: "All linked PRs are drafts",
    icon: FileEdit,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-800/50",
  },
  {
    id: "ready_for_review",
    title: "Ready for Review",
    description: "Has non-draft PR, awaiting review",
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "in_review",
    title: "In Review",
    description: "Has reviews but not yet approved",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "approved",
    title: "Approved",
    description: "Ready to merge",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
];

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  issues: LinearIssue[];
  onIssueClick: (issue: LinearIssue) => void;
  onPRClick: (prNumber: number) => void;
  theme: "light" | "dark";
}

const KanbanColumnComponent = React.memo(function KanbanColumnComponent({
  column,
  issues,
  onIssueClick,
  onPRClick,
  theme,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 min-w-72 max-w-72",
        column.bgColor,
        "border-r transition-all duration-200",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div className="p-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1.5">
          <Icon className={cn("w-3.5 h-3.5", column.color)} />
          <h3 className={cn("text-sm font-semibold", column.color)}>
            {column.title}
          </h3>
          <span
            className={cn(
              "px-1.5 py-0.5 text-xs rounded-full font-medium",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600",
            )}
          >
            {issues.length}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">
        {issues.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-8 text-center",
              theme === "dark" ? "text-gray-500" : "text-gray-400",
            )}
          >
            <Icon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No issues</p>
          </div>
        ) : (
          issues.map((issue) => (
            <LinearIssueCard
              key={issue.id}
              issue={issue}
              onIssueClick={onIssueClick}
              onPRClick={onPRClick}
              theme={theme}
            />
          ))
        )}
      </div>
    </div>
  );
});

KanbanColumnComponent.displayName = "KanbanColumn";

function NoApiKeyMessage({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <Settings
        className={cn(
          "w-12 h-12 mb-4",
          theme === "dark" ? "text-gray-600" : "text-gray-400",
        )}
      />
      <h2
        className={cn(
          "text-lg font-semibold mb-2",
          theme === "dark" ? "text-white" : "text-gray-900",
        )}
      >
        Linear API Key Required
      </h2>
      <p
        className={cn(
          "text-sm mb-4 max-w-md",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        To view Linear issues linked to your PRs, add your Linear API key in Settings → Integrations.
      </p>
      <a
        href="https://linear.app/settings/api"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium",
          "text-blue-500 hover:text-blue-400",
        )}
      >
        <ExternalLink className="w-4 h-4" />
        Get your Linear API key
      </a>
    </div>
  );
}

function NoIssuesMessage({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <GitPullRequest
        className={cn(
          "w-12 h-12 mb-4",
          theme === "dark" ? "text-gray-600" : "text-gray-400",
        )}
      />
      <h2
        className={cn(
          "text-lg font-semibold mb-2",
          theme === "dark" ? "text-white" : "text-gray-900",
        )}
      >
        No Linear Issues Found
      </h2>
      <p
        className={cn(
          "text-sm max-w-md",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        No PRs in this repository reference Linear issues. Add Linear issue IDs (e.g., ENG-123) to your PR descriptions to see them here.
      </p>
    </div>
  );
}

export default function IssueTrackerView() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    issues,
    loading,
    error,
    fetchIssuesForRepo,
    relinkIssuesForRepo,
  } = useLinearIssueStore();
  const { selectedRepo, pullRequests, fetchPullRequests, fetchPRDetails, revision } = usePRStore();
  const { theme } = useUIStore();
  const { settings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const fetchedDetailPRsRef = useRef<Set<string>>(new Set());

  const hasApiKey = Boolean(settings.linearApiKey);

  // Fetch PRs first, then Linear issues
  useEffect(() => {
    if (selectedRepo && hasApiKey) {
      console.log(`[LINEAR VIEW] 🚀 Fetching PRs for ${selectedRepo.owner}/${selectedRepo.name}`);
      // Force refresh to ensure approvalStatus is accurate for columns
      fetchPullRequests(selectedRepo.owner, selectedRepo.name, true).then(() => {
        console.log(`[LINEAR VIEW] ✅ PRs loaded, now fetching Linear issues`);
        fetchIssuesForRepo(selectedRepo.owner, selectedRepo.name);
      });
    }
  }, [selectedRepo, hasApiKey, fetchPullRequests, fetchIssuesForRepo]);

  useEffect(() => {
    if (!selectedRepo) {
      return;
    }
    fetchedDetailPRsRef.current.clear();
  }, [selectedRepo]);

  // Re-link Linear issues when PR data changes (revision increments on any PR update)
  useEffect(() => {
    if (selectedRepo && hasApiKey && issues.size > 0) {
      console.log(`[LINEAR VIEW] 🔄 PR revision changed (${revision}), re-linking Linear issues`);
      relinkIssuesForRepo(selectedRepo.owner, selectedRepo.name);
    }
  }, [revision, selectedRepo, hasApiKey, issues.size, relinkIssuesForRepo]);

  useEffect(() => {
    if (!selectedRepo || !hasApiKey || issues.size === 0) {
      return;
    }

    const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const repoKey = `${selectedRepo.owner}/${selectedRepo.name}`;
    const toFetch: number[] = [];

    for (const issue of issues.values()) {
      for (const pr of issue.linkedPRs || []) {
        if (pr.state !== "open" || pr.merged) {
          continue;
        }
        if (!pr.updatedAt || new Date(pr.updatedAt).getTime() < recentThreshold) {
          continue;
        }
        if (pr.approvalStatus && pr.approvalStatus !== "none") {
          continue;
        }

        const prKey = `${repoKey}#${pr.number}`;
        if (fetchedDetailPRsRef.current.has(prKey)) {
          continue;
        }

        fetchedDetailPRsRef.current.add(prKey);
        toFetch.push(pr.number);
      }
    }

    if (toFetch.length === 0) {
      return;
    }

    toFetch.forEach((prNumber) => {
      fetchPRDetails(selectedRepo.owner, selectedRepo.name, prNumber).catch((error) => {
        console.error(`[LINEAR VIEW] ❌ Failed to fetch PR details for #${prNumber}:`, error);
      });
    });
  }, [issues, selectedRepo, hasApiKey, fetchPRDetails]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) {
      return issues;
    }

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, LinearIssue>();

    for (const [key, issue] of issues.entries()) {
      const matchesTitle = issue.title.toLowerCase().includes(query);
      const matchesIdentifier = issue.identifier.toLowerCase().includes(query);
      const matchesDescription = issue.description?.toLowerCase().includes(query);
      const matchesProject = issue.project?.name.toLowerCase().includes(query);
      const matchesAssignee = issue.assignee?.displayName.toLowerCase().includes(query);

      if (matchesTitle || matchesIdentifier || matchesDescription || matchesProject || matchesAssignee) {
        filtered.set(key, issue);
      }
    }

    return filtered;
  }, [issues, searchQuery]);

  const categorizedIssues = useMemo(() => {
    const issuesArray = Array.from(filteredIssues.values());
    const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Debug: log all issues and their PR data
    console.log('[IssueTracker] Total issues:', issuesArray.length);
    issuesArray.forEach((issue) => {
      console.log(`[IssueTracker] ${issue.identifier}:`, {
        linkedPRs: issue.linkedPRs?.map(pr => ({
          number: pr.number,
          state: pr.state,
          draft: pr.draft,
          merged: pr.merged,
          approvalStatus: pr.approvalStatus,
          updatedAt: pr.updatedAt,
        })),
      });
    });

    const categories: Record<KanbanColumn, LinearIssue[]> = {
      draft: [],
      ready_for_review: [],
      in_review: [],
      approved: [],
    };

    issuesArray.forEach((issue) => {
      const recentLinkedPRs = issue.linkedPRs?.filter((pr) => {
        if (!pr.updatedAt) {
          return false;
        }
        return new Date(pr.updatedAt).getTime() >= recentThreshold;
      }) || [];

      // Only consider open, non-merged PRs
      const openPRs = recentLinkedPRs.filter(
        (pr) => pr.state === "open" && !pr.merged,
      ) || [];

      // Skip issues with no open PRs (all merged or closed)
      if (openPRs.length === 0) {
        console.log(`[IssueTracker] ${issue.identifier}: Skipped - no open PRs`);
        return;
      }

      // Check for approved PRs first (highest priority)
      const hasApprovedPR = openPRs.some((pr) => pr.approvalStatus === "approved");
      if (hasApprovedPR) {
        categories.approved.push(issue);
        return;
      }

      // Check for PRs with review activity (changes requested or pending reviews)
      const hasReviewActivity = openPRs.some(
        (pr) => !pr.draft && (pr.approvalStatus === "changes_requested" || pr.approvalStatus === "pending"),
      );
      if (hasReviewActivity) {
        categories.in_review.push(issue);
        return;
      }

      // Check if all PRs are drafts
      const allDrafts = openPRs.every((pr) => pr.draft);
      if (allDrafts) {
        categories.draft.push(issue);
        return;
      }

      // Has non-draft PRs but no review activity yet
      categories.ready_for_review.push(issue);
    });

    return categories;
  }, [filteredIssues]);

  const handleIssueClick = useCallback((issue: LinearIssue) => {
    // Open in Linear
    window.open(issue.url, "_blank");
  }, []);

  const handlePRClick = useCallback((prNumber: number) => {
    if (selectedRepo) {
      navigate(`/pulls/${selectedRepo.owner}/${selectedRepo.name}/${prNumber}`, {
        state: { from: location.pathname },
      });
    }
  }, [navigate, selectedRepo, location.pathname]);

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div
          className={cn(
            "px-3 py-2 border-b",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200",
          )}
        >
          <h1 className="text-base font-semibold flex items-center">
            <GitPullRequest className="w-4 h-4 mr-1.5" />
            Linear Issues
          </h1>
        </div>
        <NoApiKeyMessage theme={theme} />
      </div>
    );
  }

  const totalIssues = filteredIssues.size;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className={cn(
          "px-3 py-2 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-semibold flex items-center">
              <GitPullRequest className="w-4 h-4 mr-1.5" />
              Linear Issues
              <span
                className={cn(
                  "ml-2 text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({totalIssues})
              </span>
            </h1>
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "px-3 py-1 text-sm rounded border transition-colors w-64",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                "focus:outline-none",
              )}
            />
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span
                className={cn(
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                Loading Linear issues...
              </span>
            </div>
          </div>
        ) : totalIssues === 0 ? (
          <NoIssuesMessage theme={theme} />
        ) : (
          <div className="h-full min-h-0 overflow-x-auto">
            <div className="flex h-full min-h-0 min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  issues={categorizedIssues[column.id]}
                  onIssueClick={handleIssueClick}
                  onPRClick={handlePRClick}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
