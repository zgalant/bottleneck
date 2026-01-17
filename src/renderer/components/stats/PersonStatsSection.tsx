import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import type { PersonStats } from "../../stores/statsStore";

interface PersonStatsSectionProps {
  people: PersonStats[];
}

export function PersonStatsSection({ people }: PersonStatsSectionProps) {
  const { theme } = useUIStore();

  const sorted = [...people].sort((a, b) => b.totalPRs - a.totalPRs);

  if (sorted.length === 0) {
    return (
      <div className={cn(
        "p-6 rounded-lg border",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-gray-50 border-gray-200"
      )}>
        <p className={cn(
          "text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}>
          No author data available
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-6 rounded-lg border",
      theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}>
      <h2 className="text-xl font-bold mb-4">PR Authors</h2>

      <div className={cn(
        "overflow-x-auto"
      )}>
        <table className="w-full">
          <thead>
            <tr className={cn(
              "border-b",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}>
              <th className="text-left py-3 px-4 font-semibold text-sm">Author</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Total PRs</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Open</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Draft</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Merged</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Closed</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((person) => (
              <tr
                key={person.name}
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
                <td className="text-right py-3 px-4">
                  <span className="font-bold">{person.totalPRs}</span>
                </td>
                <td className="text-right py-3 px-4">
                  <Badge value={person.open} color="yellow" theme={theme} />
                </td>
                <td className="text-right py-3 px-4">
                  <Badge value={person.draft} color="gray" theme={theme} />
                </td>
                <td className="text-right py-3 px-4">
                  <Badge value={person.merged} color="green" theme={theme} />
                </td>
                <td className="text-right py-3 px-4">
                  <Badge value={person.closed} color="red" theme={theme} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({
  value,
  color,
  theme,
}: {
  value: number;
  color: string;
  theme: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    yellow: theme === "dark"
      ? { bg: "bg-yellow-900/50", text: "text-yellow-300" }
      : { bg: "bg-yellow-100", text: "text-yellow-700" },
    green: theme === "dark"
      ? { bg: "bg-green-900/50", text: "text-green-300" }
      : { bg: "bg-green-100", text: "text-green-700" },
    red: theme === "dark"
      ? { bg: "bg-red-900/50", text: "text-red-300" }
      : { bg: "bg-red-100", text: "text-red-700" },
    gray: theme === "dark"
      ? { bg: "bg-gray-600/50", text: "text-gray-300" }
      : { bg: "bg-gray-200", text: "text-gray-700" },
  };

  const colors = colorMap[color];

  return (
    <span className={cn("px-2 py-1 rounded text-sm font-medium", colors.bg, colors.text)}>
      {value}
    </span>
  );
}
