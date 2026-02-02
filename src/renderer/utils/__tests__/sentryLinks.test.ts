import { describe, it, expect } from "vitest";
import {
  extractSentryIssues,
  extractSentryIssueIds,
} from "../sentryLinks";

describe("extractSentryIssues", () => {
  it("extracts Sentry URLs with organization", () => {
    const text = "Fixes https://sentry.io/organizations/my-org/issues/12345678/";
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      id: "12345678",
      kind: "numericId",
      url: "https://sentry.io/organizations/my-org/issues/12345678/",
    });
  });

  it("extracts Sentry URLs without organization", () => {
    const text = "See https://sentry.io/issues/87654321/ for details";
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      id: "87654321",
      kind: "numericId",
      url: "https://sentry.io/issues/87654321/",
    });
  });

  it("extracts short IDs with project prefix", () => {
    const text = "This PR fixes FRONTEND-79 and API-2F";
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.id)).toContain("FRONTEND-79");
    expect(issues.map((i) => i.id)).toContain("API-2F");
    expect(issues[0].kind).toBe("shortId");
  });

  it("requires at least one digit in short ID to reduce false positives", () => {
    // Should not match pure-letter combinations
    const text = "This is ABC-DEF which is not a Sentry issue";
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(0);
  });

  it("extracts multiple URLs and short IDs", () => {
    const text = `
      Fixes https://sentry.io/organizations/acme/issues/111/
      Related to MOBILE-4D
      See also https://sentry.io/issues/222/
    `;
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(3);
    expect(issues.map((i) => i.id)).toContain("111");
    expect(issues.map((i) => i.id)).toContain("222");
    expect(issues.map((i) => i.id)).toContain("MOBILE-4D");
  });

  it("deduplicates identical references", () => {
    const text = "FRONTEND-79 is related to FRONTEND-79";
    const issues = extractSentryIssues(text);
    expect(issues).toHaveLength(1);
  });

  it("returns empty array for null/undefined input", () => {
    expect(extractSentryIssues(null)).toEqual([]);
    expect(extractSentryIssues(undefined)).toEqual([]);
    expect(extractSentryIssues("")).toEqual([]);
  });
});

describe("extractSentryIssueIds", () => {
  it("returns just the IDs as strings", () => {
    const text = "Fixes FRONTEND-79 and https://sentry.io/issues/12345/";
    const ids = extractSentryIssueIds(text);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("FRONTEND-79");
    expect(ids).toContain("12345");
  });
});
