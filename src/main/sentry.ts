/**
 * Sentry CLI service for the main process
 * Invokes the Sentry CLI to fetch issue details
 */

import { execFile, ExecFileOptions } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SentryTag {
  key: string;
  value: string;
  count?: number;
}

export interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit?: string;
  permalink: string;
  status: "unresolved" | "resolved" | "ignored" | "muted";
  level: "error" | "warning" | "info" | "debug" | "fatal";
  count?: number;
  userCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  tags?: SentryTag[];
  project?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Validate issue ID to prevent command injection
function isValidIssueId(id: string): boolean {
  // Numeric ID: digits only
  if (/^\d+$/.test(id)) return true;
  // Short ID: PROJECT-XX format (uppercase letters/digits/underscore/dash, then dash, then alphanumeric)
  if (/^[A-Z][A-Z0-9_-]{0,19}-[A-Z0-9]{1,10}$/i.test(id)) return true;
  return false;
}

// Run a command with the Sentry CLI
async function runSentryCli(
  args: string[],
  authToken?: string
): Promise<{ stdout: string; stderr: string }> {
  const options: ExecFileOptions = {
    timeout: 15000, // 15 second timeout
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    windowsHide: true,
    encoding: "utf8" as BufferEncoding,
    env: {
      ...process.env,
      // If auth token is provided, use it
      ...(authToken ? { SENTRY_AUTH_TOKEN: authToken } : {}),
    },
  };

  // Try 'sentry' first (new CLI), fall back to 'sentry-cli' (old CLI)
  const binaryNames = ["sentry", "sentry-cli"];
  let lastError: Error | null = null;

  for (const binary of binaryNames) {
    try {
      const result = await execFileAsync(binary, args, options);
      return {
        stdout: String(result.stdout),
        stderr: String(result.stderr),
      };
    } catch (error: any) {
      // ENOENT means binary not found, try next
      if (error.code === "ENOENT") {
        lastError = error;
        continue;
      }
      // Other errors (like non-zero exit) should be thrown
      throw error;
    }
  }

  throw lastError || new Error("Sentry CLI not found");
}

// Parse the JSON output from `sentry issue view --json`
function parseIssueJson(json: string): SentryIssue | null {
  try {
    const data = JSON.parse(json);
    
    // The CLI returns the issue data directly
    return {
      id: String(data.id || data.numericId || ""),
      shortId: data.shortId || data.short_id || "",
      title: data.title || "",
      culprit: data.culprit,
      permalink: data.permalink || data.url || "",
      status: data.status || "unresolved",
      level: data.level || "error",
      count: data.count,
      userCount: data.userCount || data.user_count,
      firstSeen: data.firstSeen || data.first_seen,
      lastSeen: data.lastSeen || data.last_seen,
      tags: data.tags,
      project: data.project ? {
        id: String(data.project.id || ""),
        name: data.project.name || "",
        slug: data.project.slug || "",
      } : undefined,
    };
  } catch (error) {
    console.error("[SENTRY CLI] Failed to parse JSON:", error);
    return null;
  }
}

/**
 * Fetch a single Sentry issue by ID
 */
export async function viewIssue(
  issueId: string,
  authToken?: string
): Promise<SentryIssue | null> {
  if (!isValidIssueId(issueId)) {
    console.error(`[SENTRY CLI] Invalid issue ID: ${issueId}`);
    return null;
  }

  try {
    const { stdout } = await runSentryCli(["issue", "view", issueId, "--json"], authToken);
    return parseIssueJson(stdout);
  } catch (error: any) {
    // Don't log auth token in errors
    const safeError = error.message?.replace(/SENTRY_AUTH_TOKEN=[^\s]+/g, "SENTRY_AUTH_TOKEN=[REDACTED]");
    console.error(`[SENTRY CLI] Error fetching issue ${issueId}:`, safeError);
    return null;
  }
}

/**
 * Fetch multiple Sentry issues by ID (with concurrency limit)
 */
export async function batchViewIssues(
  issueIds: string[],
  authToken?: string,
  concurrency = 3
): Promise<SentryIssue[]> {
  if (issueIds.length === 0) return [];

  const validIds = issueIds.filter(isValidIssueId);
  if (validIds.length === 0) return [];

  console.log(`[SENTRY CLI] Fetching ${validIds.length} issues (concurrency: ${concurrency})`);

  const results: SentryIssue[] = [];
  const queue = [...validIds];

  // Simple promise pool
  const workers = Array(Math.min(concurrency, queue.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) break;
        const issue = await viewIssue(id, authToken);
        if (issue) {
          results.push(issue);
        }
      }
    });

  await Promise.all(workers);

  console.log(`[SENTRY CLI] Fetched ${results.length} issues successfully`);
  return results;
}

/**
 * Check if Sentry CLI is available and authenticated
 */
export async function checkStatus(authToken?: string): Promise<{
  available: boolean;
  authenticated: boolean;
  error?: string;
}> {
  try {
    // Try to run `sentry auth status` to check if authenticated
    const { stdout, stderr } = await runSentryCli(["auth", "status"], authToken);
    
    // Check output for authentication status
    const output = stdout + stderr;
    const authenticated = output.toLowerCase().includes("authenticated") || 
                          output.toLowerCase().includes("logged in") ||
                          !output.toLowerCase().includes("not authenticated");

    return { available: true, authenticated };
  } catch (error: any) {
    // If ENOENT, CLI is not installed
    if (error.code === "ENOENT") {
      return { available: false, authenticated: false, error: "Sentry CLI not installed" };
    }
    // Other errors might indicate auth issues
    return { 
      available: true, 
      authenticated: false, 
      error: error.message?.replace(/SENTRY_AUTH_TOKEN=[^\s]+/g, "SENTRY_AUTH_TOKEN=[REDACTED]")
    };
  }
}
