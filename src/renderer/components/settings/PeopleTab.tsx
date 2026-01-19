import { useEffect, useState } from "react";
import { useOrgStore } from "../../stores/orgStore";
import { usePRStore } from "../../stores/prStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";

export default function PeopleTab() {
  const { theme } = useUIStore();
  const { repositories } = usePRStore();
  const { fetchOrgMembers } = useOrgStore();
  const [members, setMembers] = useState<Array<{ login: string; avatar_url: string; name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const orgs = Array.from(new Set(repositories.map((r) => r.owner)));

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedOrg && orgs.length === 0) {
        setLoading(false);
        return;
      }

      const org = selectedOrg || orgs[0];
      if (!org) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const orgMembers = await fetchOrgMembers(org);
        setMembers(orgMembers);
        setSelectedOrg(org);
      } catch (error) {
        console.error("Failed to load org members:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [selectedOrg, orgs, fetchOrgMembers]);

  if (loading) {
    return (
      <div
        className={cn(
          "p-6 text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        Loading team members...
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div
        className={cn(
          "p-6 text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        No organizations found. Start by adding repositories to view team members.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2
          className={cn(
            "text-lg font-semibold mb-4",
            theme === "dark" ? "text-white" : "text-gray-900",
          )}
        >
          Team Members
        </h2>
        
        {orgs.length > 1 && (
          <div className="mb-4">
            <label
              className={cn(
                "block text-sm font-medium mb-2",
                theme === "dark" ? "text-gray-300" : "text-gray-700",
              )}
            >
              Organization
            </label>
            <select
              value={selectedOrg || ""}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className={cn(
                "input w-48",
                theme === "dark"
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900",
              )}
            >
              {orgs.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div
        className={cn(
          "rounded-lg border overflow-hidden",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}
      >
        <div className="divide-y">
          {members.map((member) => (
            <div
              key={member.login}
              className={cn(
                "flex items-center gap-4 p-4",
                theme === "dark"
                  ? "bg-gray-800 hover:bg-gray-750 border-gray-700"
                  : "bg-white hover:bg-gray-50 border-gray-200",
              )}
            >
              <img
                src={member.avatar_url}
                alt={member.login}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-medium truncate",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  {member.name || member.login}
                </div>
                {member.name && (
                  <div
                    className={cn(
                      "text-sm truncate",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    @{member.login}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div
            className={cn(
              "p-8 text-center",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            No team members found
          </div>
        )}
      </div>

      <div
        className={cn(
          "mt-4 text-sm",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        {members.length} team member{members.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
