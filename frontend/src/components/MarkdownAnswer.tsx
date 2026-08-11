import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation } from '../types';

/**
 * Recursively process React children: turn "[N]" text nodes into citation badge buttons.
 * If no onCiteClick is provided, citations render as plain styled superscripts.
 */
export function processChildren(
  children: React.ReactNode,
  citations: Citation[],
  onCiteClick?: (n: number) => void
): React.ReactNode {
  if (typeof children === 'string') {
    const parts = children.split(/(\[\d+\])/g);
    if (parts.length === 1) return children;
    return parts.map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      if (!m) return <span key={i}>{part}</span>;
      const n = parseInt(m[1]);
      const cit = citations.find(c => c.source_num === n);
      const cls = `inline-flex items-center justify-center min-w-[1.2rem] h-5 px-1 rounded text-xs font-bold mx-0.5 align-text-top ${
        cit?.verified
          ? 'bg-brand-100 text-brand-700'
          : 'bg-red-100 text-red-600'
      }`;
      return onCiteClick ? (
        <button
          key={i}
          onClick={() => onCiteClick(n)}
          title={cit?.document_name ?? `Source ${n}`}
          className={`${cls} hover:opacity-80 transition-opacity cursor-pointer`}
        >
          {n}
        </button>
      ) : (
        <span key={i} className={cls}>{n}</span>
      );
    });
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <span key={i}>{processChildren(child, citations, onCiteClick)}</span>
    ));
  }
  return children;
}

interface MarkdownAnswerProps {
  text: string;
  citations?: Citation[];
  onCiteClick?: (n: number) => void;
  className?: string;
}

export default function MarkdownAnswer({
  text,
  citations = [],
  onCiteClick,
  className = '',
}: MarkdownAnswerProps) {
  const wrap = (children: React.ReactNode) =>
    processChildren(children, citations, onCiteClick);

  const components = {
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-3 last:mb-0 leading-relaxed">{wrap(children)}</p>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{wrap(children)}</li>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-gray-700">{children}</em>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-sm font-semibold text-gray-900 mt-3 mb-1">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-medium text-gray-900 mt-2 mb-0.5">{children}</h3>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono text-gray-800">{children}</code>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-gray-300 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
    ),
  } as Parameters<typeof ReactMarkdown>[0]['components'];

  return (
    <div className={`text-sm text-gray-800 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
