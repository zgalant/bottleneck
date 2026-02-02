/**
 * Utilities for extracting Sentry issue identifiers from text (PR descriptions, etc.)
 */

import { PullRequest } from "../services/github";

/**
 * Sentry issue info extracted from PR body
 */
export interface SentryIssueRef {
  id: string;       // e.g., "FRONTEND-79" or "12345678"
  kind: "shortId" | "numericId";
  url?: string;     // Full Sentry URL if extracted from URL pattern
}

/**
 * Regex patterns to match Sentry issue identifiers
 *
 * Matches:
 * - FRONTEND-79 (project slug + short ID)
 * - https://sentry.io/organizations/org/issues/12345678
 * - https://sentry.io/issues/12345678
 */
const SENTRY_URL_PATTERN = /https?:\/\/sentry\.io\/(?:organizations\/([^/]+)\/)?issues\/(\d+)(?:\/[^\s)>\]]*)?/gi;

// Short ID pattern: PROJECT-XX where suffix contains at least one digit to reduce false positives
// e.g., FRONTEND-79, API-2F, MOBILE-4D
const SENTRY_SHORT_ID_PATTERN = /\b([A-Z][A-Z0-9_-]{0,19}-[A-Z0-9]*\d[A-Z0-9]*)\b/g;

/**
 * Extract Sentry issue references from text
 * Returns deduplicated list of references
 */
export function extractSentryIssues(text: string | null | undefined): SentryIssueRef[] {
  if (!text) return [];

  const refs: SentryIssueRef[] = [];
  const seenIds = new Set<string>();

  // Match Sentry URLs first (more specific)
  SENTRY_URL_PATTERN.lastIndex = 0;
  let match;
  while ((match = SENTRY_URL_PATTERN.exec(text)) !== null) {
    const org = match[1];
    const numericId = match[2];

    if (!seenIds.has(numericId)) {
      seenIds.add(numericId);
      refs.push({
        id: numericId,
        kind: "numericId",
        url: org
          ? `https://sentry.io/organizations/${org}/issues/${numericId}/`
          : `https://sentry.io/issues/${numericId}/`,
      });
    }
  }

  // Match short IDs (e.g., FRONTEND-79)
  SENTRY_SHORT_ID_PATTERN.lastIndex = 0;
  while ((match = SENTRY_SHORT_ID_PATTERN.exec(text)) !== null) {
    const shortId = match[1].toUpperCase();

    if (!seenIds.has(shortId)) {
      seenIds.add(shortId);
      refs.push({
        id: shortId,
        kind: "shortId",
      });
    }
  }

  return refs;
}

/**
 * Extract just the Sentry issue IDs (strings) from text
 */
export function extractSentryIssueIds(text: string | null | undefined): string[] {
  return extractSentryIssues(text).map(ref => ref.id);
}

/**
 * Extract Sentry issue IDs from a pull request's body/description and title
 */
export function extractSentryIdsFromPR(pr: PullRequest): string[] {
  const allText = [pr.body, pr.title].filter(Boolean).join("\n");
  return extractSentryIssueIds(allText);
}

/**
 * Build a map of Sentry issue ID -> PRs that reference it
 */
export function buildSentryIssueToPRMap(
  pullRequests: Map<string, PullRequest>,
  repoOwner: string,
  repoName: string
): Map<string, PullRequest[]> {
  const map = new Map<string, PullRequest[]>();

  for (const pr of pullRequests.values()) {
    // Filter to PRs from the current repo
    const prRepoOwner = pr.base?.repo?.owner?.login;
    const prRepoName = pr.base?.repo?.name;
    if (prRepoOwner !== repoOwner || prRepoName !== repoName) {
      continue;
    }

    const sentryIds = extractSentryIdsFromPR(pr);
    for (const id of sentryIds) {
      const existing = map.get(id) || [];
      existing.push(pr);
      map.set(id, existing);
    }
  }

  return map;
}

/**
 * Get all unique Sentry issue IDs referenced by PRs in a repo
 */
export function getAllSentryIdsFromPRs(
  pullRequests: Map<string, PullRequest>,
  repoOwner: string,
  repoName: string
): string[] {
  const ids = new Set<string>();

  for (const pr of pullRequests.values()) {
    const prRepoOwner = pr.base?.repo?.owner?.login;
    const prRepoName = pr.base?.repo?.name;
    if (prRepoOwner !== repoOwner || prRepoName !== repoName) {
      continue;
    }

    const sentryIds = extractSentryIdsFromPR(pr);
    for (const id of sentryIds) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}
