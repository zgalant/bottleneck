/**
 * Sentry types and renderer-side API for fetching Sentry issues via IPC
 */

export interface SentryTag {
  key: string;
  value: string;
  count?: number;
}

export interface SentryIssue {
  id: string;           // Numeric ID as string
  shortId: string;      // e.g., "FRONTEND-79"
  title: string;
  culprit?: string;     // e.g., "src/components/App.tsx"
  permalink: string;    // Full URL to the issue
  status: "unresolved" | "resolved" | "ignored" | "muted";
  level: "error" | "warning" | "info" | "debug" | "fatal";
  count?: number;       // Event count
  userCount?: number;   // Affected users count
  firstSeen?: string;   // ISO timestamp
  lastSeen?: string;    // ISO timestamp
  tags?: SentryTag[];   // Issue tags
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  // Enriched field: PRs that reference this issue
  linkedPRs?: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    draft: boolean;
    merged: boolean;
    approvalStatus?: "approved" | "changes_requested" | "pending" | "none";
    updatedAt?: string;
    author?: {
      login: string;
      avatarUrl: string;
    };
  }>;
}

/**
 * Fetch Sentry issues via IPC (calls main process which invokes Sentry CLI)
 */
export async function fetchSentryIssues(issueIds: string[]): Promise<SentryIssue[]> {
  if (!window.electron?.sentry?.batchViewIssues) {
    console.warn("[SENTRY] Sentry IPC not available");
    return [];
  }

  try {
    const result = await window.electron.sentry.batchViewIssues(issueIds);
    if (result.success && result.issues) {
      return result.issues;
    }
    if (result.error) {
      console.error("[SENTRY] Error fetching issues:", result.error);
    }
    return [];
  } catch (error) {
    console.error("[SENTRY] IPC error:", error);
    return [];
  }
}

/**
 * Fetch a single Sentry issue by ID
 */
export async function fetchSentryIssue(issueId: string): Promise<SentryIssue | null> {
  if (!window.electron?.sentry?.viewIssue) {
    console.warn("[SENTRY] Sentry IPC not available");
    return null;
  }

  try {
    const result = await window.electron.sentry.viewIssue(issueId);
    if (result.success && result.issue) {
      return result.issue;
    }
    if (result.error) {
      console.error("[SENTRY] Error fetching issue:", result.error);
    }
    return null;
  } catch (error) {
    console.error("[SENTRY] IPC error:", error);
    return null;
  }
}

/**
 * Check if Sentry CLI is available and configured
 */
export async function checkSentryStatus(): Promise<{
  available: boolean;
  authenticated: boolean;
  error?: string;
}> {
  if (!window.electron?.sentry?.checkStatus) {
    return { available: false, authenticated: false, error: "Sentry IPC not available" };
  }

  try {
    const result = await window.electron.sentry.checkStatus();
    return {
      available: result.available ?? false,
      authenticated: result.authenticated ?? false,
      error: result.error,
    };
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      error: String(error),
    };
  }
}
