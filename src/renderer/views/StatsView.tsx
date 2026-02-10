import { useEffect, useMemo, useState } from "react";
import { usePRStore } from "../stores/prStore";
import { useStatsStore } from "../stores/statsStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { GitPullRequest, Code2, Eye, ArrowUp, ArrowDown, Ship } from "lucide-react";

export default function StatsView() {
  const { theme } = useUIStore();
  const { pullRequests } = usePRStore();
  const { calculateStats, currentSnapshot, activity } = useStatsStore();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    calculateStats(pullRequests);
  }, [pullRequests, calculateStats]);

  const reviewedByPersonArray = useMemo(() => {
    if (!currentSnapshot) return [];
    return Array.from(currentSnapshot.reviewedByPerson.values()).sort(
      (a, b) => b.reviewCount - a.reviewCount
    );
  }, [currentSnapshot]);

  const handleSortClick = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column with desc direction
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      onClick={() => handleSortClick(column)}
      className={cn(
        "text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-600/20 transition-colors",
        theme === "dark" ? "text-gray-400" : "text-gray-600"
      )}
    >
      <div className="flex items-center justify-end gap-2">
        <span>{label}</span>
        {sortColumn === column && (
          sortDirection === "desc" ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )
        )}
      </div>
    </th>
  );

  const activityTableRows = useMemo(() => {
    if (activity.length === 0) return [];

    // Get all unique people across all periods
    const allPeople = new Set<string>();
    activity.forEach((period) => {
      period.merged.forEach((_, key) => allPeople.add(key));
      period.reviewed.forEach((_, key) => allPeople.add(key));
    });

    // Build rows with data from each period
    let rows = Array.from(allPeople)
      .sort()
      .map((personKey) => {
        const rowData: {
          person: string;
          avatar?: string;
          [key: string]: number | string | undefined;
        } = {
          person: personKey,
          avatar: undefined,
        };

        activity.forEach((period) => {
          const merged = period.merged.get(personKey);
          const reviewed = period.reviewed.get(personKey);

          rowData[`${period.days}d_merged`] = merged?.count || 0;
          rowData[`${period.days}d_reviewed`] = reviewed?.count || 0;

          if (!rowData.avatar) {
            rowData.avatar = merged?.avatarUrl || reviewed?.avatarUrl;
          }
        });

        return rowData as {
          person: string;
          avatar?: string;
          "1d_merged": number;
          "1d_reviewed": number;
          "7d_merged": number;
          "7d_reviewed": number;
          "30d_merged": number;
          "30d_reviewed": number;
        };
      });

    // Apply sorting
    if (sortColumn) {
      rows.sort((a, b) => {
        let aValue = a[sortColumn];
        let bValue = b[sortColumn];

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === "asc" ? comparison : -comparison;
        }

        // Handle number comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          const comparison = aValue - bValue;
          return sortDirection === "asc" ? comparison : -comparison;
        }

        return 0;
      });
    }

    return rows;
  }, [activity, sortColumn, sortDirection]);

  if (!currentSnapshot) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center justify-center",
          theme === "dark" ? "bg-gray-900" : "bg-white"
        )}
      >
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
          Loading stats...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "sticky top-0 z-10 p-6 border-b flex-shrink-0",
          theme === "dark"
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
        )}
      >
        <h1 className="text-3xl font-bold">PR Status</h1>
        <p
          className={cn(
            "mt-2",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
        >
          Current snapshot and recent activity
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Current Snapshot */}
        <div
          className={cn(
            "p-6 rounded-lg border",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200"
          )}
        >
          <h2 className="text-xl font-bold mb-4">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ready to Ship Card */}
            <div
              className={cn(
                "p-4 rounded-lg border flex items-center gap-4",
                theme === "dark"
                  ? "bg-gray-900 border-gray-600"
                  : "bg-white border-gray-200"
              )}
            >
              <div>
                <Ship
                  className={cn(
                    "w-10 h-10",
                    theme === "dark" ? "text-green-400" : "text-green-600"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Ready to Ship
                </p>
                <p
                  className={cn(
                    "text-3xl font-bold mt-1",
                    theme === "dark" ? "text-green-400" : "text-green-600"
                  )}
                >
                  {currentSnapshot.readyToShip}
                </p>
              </div>
            </div>

            {/* Open PRs Card */}
            <div
              className={cn(
                "p-4 rounded-lg border flex items-center gap-4",
                theme === "dark"
                  ? "bg-gray-900 border-gray-600"
                  : "bg-white border-gray-200"
              )}
            >
              <div>
                <Code2
                  className={cn(
                    "w-10 h-10",
                    theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Open PRs
                </p>
                <p
                  className={cn(
                    "text-3xl font-bold mt-1",
                    theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                  )}
                >
                  {currentSnapshot.open}
                </p>
              </div>
            </div>

            {/* Needs Review Card */}
            <div
              className={cn(
                "p-4 rounded-lg border flex items-center gap-4",
                theme === "dark"
                  ? "bg-gray-900 border-gray-600"
                  : "bg-white border-gray-200"
              )}
            >
              <div>
                <Eye
                  className={cn(
                    "w-10 h-10",
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Needs Review
                </p>
                <p
                  className={cn(
                    "text-3xl font-bold mt-1",
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  )}
                >
                  {currentSnapshot.needsReview}
                </p>
              </div>
            </div>
          </div>

          {/* Reviewer Stats Section */}
          {reviewedByPersonArray.length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: theme === "dark" ? "#555" : "#ddd" }}>
              <h3 className="text-lg font-semibold mb-3">Reviewer Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reviewedByPersonArray.map((person) => (
                  <div
                    key={person.login}
                    className={cn(
                      "p-3 rounded border",
                      theme === "dark"
                        ? "bg-gray-900 border-gray-600"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {person.avatarUrl && (
                        <img
                          src={person.avatarUrl}
                          alt={person.name}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="font-medium text-sm">{person.name}</span>
                    </div>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      )}
                    >
                      {person.reviewCount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-Person Current Stats Table */}
          {currentSnapshot.personStats && currentSnapshot.personStats.length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: theme === "dark" ? "#555" : "#ddd" }}>
              <h3 className="text-lg font-semibold mb-3">Per-Person Current Stats</h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr
                      className={cn(
                        "border-b",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      )}
                    >
                      <th
                        className={cn(
                          "text-left py-3 px-4 font-semibold",
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        Name
                      </th>
                      <th
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        Open
                      </th>
                      <th
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        Draft
                      </th>
                      <th
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        Assigned for Review
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSnapshot.personStats.map((person) => (
                      <tr
                        key={person.login}
                        className={cn(
                          "border-b transition-colors",
                          theme === "dark"
                            ? "border-gray-700 hover:bg-gray-700/50"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {person.avatarUrl && (
                              <img
                                src={person.avatarUrl}
                                alt={person.name}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="font-medium">{person.name}</span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "text-right py-3 px-4 font-semibold",
                            person.open > 0
                              ? theme === "dark"
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                          )}
                        >
                          {person.open}
                        </td>
                        <td
                          className={cn(
                            "text-right py-3 px-4 font-semibold",
                            person.draft > 0
                              ? theme === "dark"
                                ? "text-purple-400"
                                : "text-purple-600"
                              : theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                          )}
                        >
                          {person.draft}
                        </td>
                        <td
                          className={cn(
                            "text-right py-3 px-4 font-semibold",
                            person.assignedForReview > 0
                              ? theme === "dark"
                                ? "text-blue-400"
                                : "text-blue-600"
                              : theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                          )}
                        >
                          {person.assignedForReview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Activity Table */}
        {activityTableRows.length > 0 && (
          <div
            className={cn(
              "p-6 rounded-lg border",
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-gray-50 border-gray-200"
            )}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Recent Activity
            </h2>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr
                    className={cn(
                      "border-b",
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    )}
                  >
                    <th
                      onClick={() => handleSortClick("person")}
                      className={cn(
                        "text-left py-3 px-4 font-semibold cursor-pointer hover:bg-gray-600/20 transition-colors",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>Person</span>
                        {sortColumn === "person" && (
                          sortDirection === "desc" ? (
                            <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUp className="w-4 h-4" />
                          )
                        )}
                      </div>
                    </th>
                    {/* 1 day */}
                    <SortHeader column="1d_merged" label="1d M" />
                    <SortHeader column="1d_reviewed" label="1d R" />
                    {/* 7 days */}
                    <SortHeader column="7d_merged" label="7d M" />
                    <SortHeader column="7d_reviewed" label="7d R" />
                    {/* 30 days */}
                    <SortHeader column="30d_merged" label="30d M" />
                    <SortHeader column="30d_reviewed" label="30d R" />
                  </tr>
                </thead>
                <tbody>
                  {activityTableRows.map((row) => (
                    <tr
                      key={row.person}
                      className={cn(
                        "border-b transition-colors",
                        theme === "dark"
                          ? "border-gray-700 hover:bg-gray-700/50"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {row.avatar && (
                            <img
                              src={row.avatar}
                              alt={row.person}
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span className="font-medium">{row.person}</span>
                        </div>
                      </td>
                      {/* 1 day */}
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["1d_merged"] > 0
                            ? theme === "dark"
                              ? "text-green-400"
                              : "text-green-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["1d_merged"]}
                      </td>
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["1d_reviewed"] > 0
                            ? theme === "dark"
                              ? "text-blue-400"
                              : "text-blue-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["1d_reviewed"]}
                      </td>
                      {/* 7 days */}
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["7d_merged"] > 0
                            ? theme === "dark"
                              ? "text-green-400"
                              : "text-green-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["7d_merged"]}
                      </td>
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["7d_reviewed"] > 0
                            ? theme === "dark"
                              ? "text-blue-400"
                              : "text-blue-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["7d_reviewed"]}
                      </td>
                      {/* 30 days */}
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["30d_merged"] > 0
                            ? theme === "dark"
                              ? "text-green-400"
                              : "text-green-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["30d_merged"]}
                      </td>
                      <td
                        className={cn(
                          "text-right py-3 px-4 font-semibold",
                          row["30d_reviewed"] > 0
                            ? theme === "dark"
                              ? "text-blue-400"
                              : "text-blue-600"
                            : theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {row["30d_reviewed"]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
