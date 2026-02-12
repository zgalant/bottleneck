import { useState, memo } from "react";
import { Check, Copy, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";

interface AgentPromptBlockProps {
  prompt: string;
  className?: string;
}

export const AgentPromptBlock = memo(function AgentPromptBlock({
  prompt,
  className,
}: AgentPromptBlockProps) {
  const { theme } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const isDark = theme === "dark";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={cn("mt-3", className)}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-1 text-sm font-medium cursor-pointer select-none",
          isDark ? "text-gray-300" : "text-gray-700",
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Prompt for agents</span>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div
          className={cn(
            "mt-2 rounded-md border relative group",
            isDark
              ? "bg-gray-800/50 border-gray-700"
              : "bg-gray-50 border-gray-200",
          )}
        >
          {/* Copy button - appears on hover */}
          <button
            onClick={handleCopy}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded transition-all",
              "opacity-0 group-hover:opacity-100",
              copied
                ? "text-green-500"
                : isDark
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200",
            )}
            title="Copy prompt"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Prompt Content */}
          <div className="p-3 pr-10">
            <pre
              className={cn(
                "text-sm whitespace-pre-wrap break-words leading-relaxed",
                isDark ? "text-gray-200" : "text-gray-800",
              )}
            >
              {prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Parses a markdown comment body and extracts "Prompt for agents" sections.
 * Returns the content before, the prompt, and content after (if any).
 */
export function parseAgentPrompt(body: string): {
  beforeContent: string;
  prompt: string | null;
  afterContent: string;
} {
  // Match various formats of "Prompt for agents" sections:
  // 1. HTML details/summary: <details><summary>▼ Prompt for agents</summary>...</details>
  // 2. Markdown collapsible: ▼ Prompt for agents or ▶ Prompt for agents followed by content
  // 3. Simple header: ## Prompt for agents or **Prompt for agents**
  
  // Try HTML details pattern first
  const detailsRegex = /<details[^>]*>\s*<summary[^>]*>.*?Prompt for agents.*?<\/summary>\s*([\s\S]*?)\s*<\/details>/i;
  const detailsMatch = body.match(detailsRegex);
  
  if (detailsMatch) {
    const beforeContent = body.slice(0, detailsMatch.index).trim();
    const afterContent = body.slice(detailsMatch.index! + detailsMatch[0].length).trim();
    let prompt = detailsMatch[1].trim();
    
    // Remove backticks if the prompt is wrapped in a code block
    prompt = extractCodeContent(prompt);
    
    return { beforeContent, prompt, afterContent };
  }
  
  // Try markdown header pattern: ▼ Prompt for agents or ## Prompt for agents
  const headerRegex = /(?:^|\n)(?:[▼▶]\s*|#+\s*|\*\*)?Prompt for agents\**\s*\n([\s\S]*?)(?=\n(?:#+\s|\*\*[^*]|▼|▶|$)|$)/i;
  const headerMatch = body.match(headerRegex);
  
  if (headerMatch) {
    const matchStart = body.indexOf(headerMatch[0]);
    const beforeContent = body.slice(0, matchStart).trim();
    const afterContent = body.slice(matchStart + headerMatch[0].length).trim();
    let prompt = headerMatch[1].trim();
    
    // Remove backticks if the prompt is wrapped in a code block
    prompt = extractCodeContent(prompt);
    
    return { beforeContent, prompt, afterContent };
  }
  
  return { beforeContent: body, prompt: null, afterContent: "" };
}

/**
 * Extracts content from code blocks (removes ``` wrappers)
 */
function extractCodeContent(content: string): string {
  // Remove code block wrappers if present
  const codeBlockRegex = /^```[\w]*\n?([\s\S]*?)\n?```$/;
  const match = content.match(codeBlockRegex);
  if (match) {
    return match[1].trim();
  }
  
  // Remove inline code if the entire content is wrapped in backticks
  if (content.startsWith("`") && content.endsWith("`")) {
    return content.slice(1, -1).trim();
  }
  
  return content;
}

/**
 * Checks if a user is a known AI agent
 */
export function isAgentUser(login: string): boolean {
  const agentLogins = [
    "devin-ai-integration",
    "devin-ai-integration[bot]",
    "github-actions[bot]",
    "dependabot[bot]",
    "copilot[bot]",
  ];
  return agentLogins.some(agent => 
    login.toLowerCase() === agent.toLowerCase() ||
    login.toLowerCase().includes("devin")
  );
}
