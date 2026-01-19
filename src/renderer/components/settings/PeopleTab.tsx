import { useEffect, useState } from "react";
import { useOrgStore } from "../../stores/orgStore";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";

export default function PeopleTab() {
  const { theme } = useUIStore();
  const { user } = useAuthStore();
  const { fetchOrgMembers } = useOrgStore();
  const [members, setMembers] = useState<Array<{ login: string; avatar_url: string; name?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const org = user.login;
        const orgMembers = await fetchOrgMembers(org);
        setMembers(orgMembers);
      } catch (error) {
        console.error("Failed to load org members:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [user, fetchOrgMembers]);

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

  return (
    <div className="p-6">
      <h2
        className={cn(
          "text-lg font-semibold mb-4",
          theme === "dark" ? "text-white" : "text-gray-900",
        )}
      >
        Team Members
      </h2>

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
