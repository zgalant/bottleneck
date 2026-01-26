import { useState, useMemo } from "react";
import { Heart, HeartOff, Search } from "lucide-react";
import { usePRStore } from "../../stores/prStore";
import { useUIStore } from "../../stores/uiStore";
import { useFollowedUsersStore } from "../../stores/followedUsersStore";
import { cn } from "../../utils/cn";

interface Author {
  login: string;
  avatar_url: string;
}

export default function FollowingTab() {
  const { theme } = useUIStore();
  const { pullRequests, selectedRepo } = usePRStore();
  const { isFollowing, follow, unfollow } = useFollowedUsersStore();
  const [searchQuery, setSearchQuery] = useState("");

  const owner = selectedRepo?.owner;
  const repo = selectedRepo?.name;

  const authors = useMemo(() => {
    if (!owner || !repo) return [];

    const authorMap = new Map<string, Author>();
    pullRequests.forEach((pr) => {
      const prOwner = pr.base?.repo?.owner?.login;
      const prRepo = pr.base?.repo?.name;
      if (prOwner === owner && prRepo === repo && pr.user) {
        const login = pr.user.login.toLowerCase();
        if (!authorMap.has(login)) {
          authorMap.set(login, {
            login: pr.user.login,
            avatar_url: pr.user.avatar_url,
          });
        }
      }
    });

    return Array.from(authorMap.values()).sort((a, b) =>
      a.login.toLowerCase().localeCompare(b.login.toLowerCase())
    );
  }, [pullRequests, owner, repo]);

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authors;
    const query = searchQuery.toLowerCase();
    return authors.filter((a) => a.login.toLowerCase().includes(query));
  }, [authors, searchQuery]);

  const handleToggleFollow = (author: Author) => {
    if (!owner || !repo) return;

    if (isFollowing(owner, repo, author.login)) {
      unfollow(owner, repo, author.login);
    } else {
      follow(owner, repo, author.login, author.avatar_url);
    }
  };

  if (!selectedRepo) {
    return (
      <div
        className={cn(
          "p-6 text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}
      >
        Select a repository to manage followed users.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2
          className={cn(
            "text-lg font-semibold mb-2",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}
        >
          Following
        </h2>
        <p
          className={cn(
            "text-sm mb-4",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
        >
          Follow contributors to see their PRs in the Following view. Settings are per-repository.
        </p>

        <div className="relative mb-4">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            )}
          />
          <input
            type="text"
            placeholder="Search contributors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            )}
          />
        </div>
      </div>

      {authors.length === 0 ? (
        <div
          className={cn(
            "p-8 text-center rounded-lg border",
            theme === "dark"
              ? "border-gray-700 text-gray-400"
              : "border-gray-200 text-gray-600"
          )}
        >
          No contributors found for this repository.
        </div>
      ) : (
        <div
          className={cn(
            "rounded-lg border overflow-hidden",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div className={cn("divide-y", theme === "dark" ? "divide-gray-700" : "divide-gray-200")}>
            {filteredAuthors.map((author) => {
              const following = owner && repo ? isFollowing(owner, repo, author.login) : false;

              return (
                <div
                  key={author.login}
                  className={cn(
                    "flex items-center justify-between gap-4 p-4",
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={author.avatar_url}
                      alt={author.login}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div>
                      <div
                        className={cn(
                          "font-medium",
                          theme === "dark" ? "text-white" : "text-gray-900"
                        )}
                      >
                        {author.login}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFollow(author)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      following
                        ? theme === "dark"
                          ? "bg-pink-900/30 text-pink-400 hover:bg-pink-900/50"
                          : "bg-pink-50 text-pink-600 hover:bg-pink-100"
                        : theme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {following ? (
                      <>
                        <Heart className="w-4 h-4 fill-current" />
                        Following
                      </>
                    ) : (
                      <>
                        <HeartOff className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {filteredAuthors.length === 0 && searchQuery && (
            <div
              className={cn(
                "p-8 text-center",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              No contributors match "{searchQuery}"
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "mt-4 text-sm",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}
      >
        {filteredAuthors.length} contributor{filteredAuthors.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
    </div>
  );
}
