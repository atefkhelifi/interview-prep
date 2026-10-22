import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";
import { slugify } from "@/lib/slug";

// tone "pen": written by the grader (feedback), in red pen.
export function Markdown({ children, tone }: { children: string; tone?: "pen" }) {
  return (
    <div
      className={`prose max-w-none prose-pre:rounded-[3px] prose-pre:bg-[#0d1117] prose-code:before:content-none prose-code:after:content-none ${tone === "pen" ? "prose-pen" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Anchor ids so the table of contents can link to sections.
          h2: ({ children }) => (
            <h2 id={slugify(String(children))} className="scroll-mt-20">
              {children}
            </h2>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
