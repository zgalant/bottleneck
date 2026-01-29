/**
 * Linear API client for fetching issues
 */

export interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinearState {
  id: string;
  name: string;
  type: "backlog" | "unstarted" | "started" | "completed" | "canceled" | "triage";
  color: string;
}

export interface LinearProject {
  id: string;
  name: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearIssue {
  id: string;
  identifier: string; // e.g., "ENG-123"
  title: string;
  description?: string;
  url: string;
  state: LinearState;
  assignee?: LinearUser;
  project?: LinearProject;
  team: LinearTeam;
  priority: number; // 0 = no priority, 1 = urgent, 2 = high, 3 = medium, 4 = low
  createdAt: string;
  updatedAt: string;
  // Enriched field: PRs that reference this issue
  linkedPRs?: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    draft: boolean;
    merged: boolean;
    approvalStatus?: "approved" | "changes_requested" | "pending" | "none";
    author?: {
      login: string;
      avatarUrl: string;
    };
  }>;
}

const LINEAR_API_URL = "https://api.linear.app/graphql";

export class LinearAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[LINEAR API] Error response:", result);
      const errorMessage = result.errors?.[0]?.message || result.error || `${response.status} ${response.statusText}`;
      throw new Error(`Linear API error: ${errorMessage}`);
    }

    if (result.errors) {
      console.error("[LINEAR API] GraphQL errors:", result.errors);
      throw new Error(`Linear GraphQL error: ${result.errors[0]?.message || "Unknown error"}`);
    }

    return result.data;
  }

  /**
   * Issue fields fragment for reuse
   */
  private static readonly ISSUE_FIELDS = `
    id
    identifier
    title
    description
    url
    priority
    createdAt
    updatedAt
    state {
      id
      name
      type
      color
    }
    assignee {
      id
      name
      displayName
      avatarUrl
    }
    project {
      id
      name
      color
    }
    team {
      id
      key
      name
    }
  `;

  /**
   * Fetch a single issue by identifier
   */
  async getIssueByIdentifier(identifier: string): Promise<LinearIssue | null> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          ${LinearAPI.ISSUE_FIELDS}
        }
      }
    `;

    try {
      const data = await this.query<{ issue: LinearIssue | null }>(query, { id: identifier });
      return data.issue;
    } catch (error) {
      // Issue not found is expected for some identifiers
      console.warn(`[LINEAR API] Issue ${identifier} not found`);
      return null;
    }
  }

  /**
   * Fetch multiple issues by their identifiers (e.g., ["ENG-123", "TEAM-456"])
   * Fetches each issue individually since batch queries fail if any issue is missing
   */
  async getIssuesByIdentifiers(identifiers: string[]): Promise<LinearIssue[]> {
    if (identifiers.length === 0) return [];

    console.log(`[LINEAR API] Fetching ${identifiers.length} issues by identifier`);

    // Fetch each issue individually (batch fails if any issue is not found)
    const results = await Promise.allSettled(
      identifiers.map(id => this.getIssueByIdentifier(id))
    );

    const issues: LinearIssue[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && result.value) {
        issues.push(result.value);
      } else if (result.status === "rejected") {
        console.warn(`[LINEAR API] Failed to fetch ${identifiers[i]}:`, result.reason);
      }
    }

    console.log(`[LINEAR API] Found ${issues.length} issues out of ${identifiers.length} requested`);
    return issues;
  }

  /**
   * Search issues by text query
   */
  async searchIssues(searchQuery: string, limit = 50): Promise<LinearIssue[]> {
    const query = `
      query SearchIssues($query: String!, $first: Int!) {
        issueSearch(query: $query, first: $first) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            createdAt
            updatedAt
            state {
              id
              name
              type
              color
            }
            assignee {
              id
              name
              displayName
              avatarUrl
            }
            project {
              id
              name
              color
            }
            team {
              id
              key
              name
            }
          }
        }
      }
    `;

    const data = await this.query<{ issueSearch: { nodes: LinearIssue[] } }>(query, {
      query: searchQuery,
      first: limit,
    });
    return data.issueSearch.nodes;
  }
}
