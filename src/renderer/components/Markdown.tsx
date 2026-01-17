import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { visit } from "unist-util-visit";
import { Components } from "react-markdown";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { CodeBlock } from "./CodeBlock";

interface MarkdownProps {
  content: string;
  variant?: "full" | "compact"; // full = rich prose styling, compact = minimal styling for comments
}

// Regex to match URLs
const urlRegex = /(https?:\/\/[^\s\)]+)/g;

// Plugin to convert plain text URLs to links
function rehypeUrlTransform() {
  return (tree: any) => {
    visit(tree, "text", (node, index, parent) => {
      if (!node.value.includes("http")) return;

      const matches = Array.from(node.value.matchAll(urlRegex));
      if (matches.length === 0) return;

      const children = [];
      let lastIndex = 0;

      matches.forEach((match) => {
        const url = match[0];
        const startIndex = match.index || 0;

        // Add text before URL
        if (startIndex > lastIndex) {
          children.push({
            type: "text",
            value: node.value.slice(lastIndex, startIndex),
          });
        }

        // Add URL as link
        children.push({
          type: "element",
          tagName: "a",
          properties: { href: url },
          children: [{ type: "text", value: url }],
        });

        lastIndex = startIndex + url.length;
      });

      // Add remaining text
      if (lastIndex < node.value.length) {
        children.push({
          type: "text",
          value: node.value.slice(lastIndex),
        });
      }

      // Replace the text node with the new children
      if (children.length > 0 && parent) {
        parent.children.splice(index, 1, ...children);
      }
    });
  };
}

// Internal component that does the actual rendering
const MarkdownRenderer = memo(
  ({ content, theme, variant = "full" }: { content: string; theme: "light" | "dark"; variant?: "full" | "compact" }) => {
    // Custom components for ReactMarkdown
    const components: Components = {
      // Custom image rendering with proper sizing and dark mode support
      img({ node, ...props }: any) {
        return (
          <img
            {...props}
            className={cn(
              "max-w-full h-auto rounded",
              theme === "dark" ? "opacity-90" : "",
            )}
            loading="lazy"
          />
        );
      },
      // Custom link rendering
      a({ node, children, ...props }: any) {
        return (
          <a
            {...props}
            className={cn(
              "text-blue-600 hover:text-blue-700 underline",
              theme === "dark" ? "text-blue-400 hover:text-blue-300" : "",
            )}
            target={props.href?.startsWith("http") ? "_blank" : undefined}
            rel={
              props.href?.startsWith("http") ? "noopener noreferrer" : undefined
            }
          >
            {children}
          </a>
        );
      },
      // Custom code block rendering
      code({ node, className, children, ...props }: any) {
        const inline = !className?.startsWith("language-");
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : undefined;
        const codeString = String(children).replace(/\n$/, "");

        // For inline code, use default styling
        if (inline) {
          return (
            <code
              className={cn(
                "px-1.5 py-0.5 rounded text-sm font-medium",
                theme === "dark"
                  ? "bg-gray-800 text-gray-200 border border-gray-700"
                  : "bg-gray-100 text-gray-800 border border-gray-200",
              )}
              {...props}
            >
              {children}
            </code>
          );
        }

        // For code blocks, use our custom CodeBlock component
        return (
          <CodeBlock
            code={codeString}
            language={language}
            showLineNumbers={false} // Line numbers disabled by default
            className="my-4"
          />
        );
      },
      // Custom pre tag to prevent double wrapping
      pre({ children }) {
        return <>{children}</>;
      },
    };

    return (
      <div
        className={cn(
          variant === "full" ? [
            "prose prose-sm max-w-none markdown-content",
            theme === "dark" ? "prose-invert" : "",
            // Base prose styles
            "prose-headings:font-semibold",
            "prose-p:leading-relaxed",
            "prose-p:my-2",
            "prose-strong:font-bold",
            "prose-em:italic",
            // Remove default pre/code styles since we're using custom components
            "[&>pre]:contents",
            // Table styles
            "prose-table:border-collapse",
            theme === "dark"
              ? "prose-th:border-gray-600 prose-td:border-gray-700"
              : "prose-th:border-gray-300 prose-td:border-gray-200",
            // List styles
            "prose-ul:list-disc prose-ol:list-decimal",
            // Blockquote styles
            theme === "dark"
              ? "prose-blockquote:border-gray-600 prose-blockquote:text-gray-300"
              : "prose-blockquote:border-gray-300 prose-blockquote:text-gray-600",
            // Text color
            theme === "dark"
              ? "prose-p:text-gray-300 prose-li:text-gray-300 prose-headings:text-gray-100"
              : "prose-p:text-gray-700 prose-li:text-gray-700 prose-headings:text-gray-900",
          ] : [
            // Compact mode: minimal styling, just basic text colors and spacing
            "max-w-none markdown-content-compact",
            theme === "dark" ? "text-gray-300" : "text-gray-700",
            // Minimal spacing for compact mode
            "[&>*]:my-1",
            "[&>hr]:my-2 [&>hr]:border-t",
            theme === "dark" ? "[&>hr]:border-gray-700" : "[&>hr]:border-gray-300",
            "[&_strong]:font-semibold",
            "[&_em]:italic",
            "[&_ul]:list-disc [&_ul]:ml-4",
            "[&_ol]:list-decimal [&_ol]:ml-4",
            "[&_li]:ml-2",
            "[&>pre]:contents",
          ]
        )}
      >
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeUrlTransform]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
);

// Export the main component that subscribes to theme
export const Markdown = memo(({ content, variant = "full" }: MarkdownProps) => {
  const theme = useUIStore((state) => state.theme); // Only subscribe to theme changes
  return <MarkdownRenderer content={content} theme={theme} variant={variant} />;
});
