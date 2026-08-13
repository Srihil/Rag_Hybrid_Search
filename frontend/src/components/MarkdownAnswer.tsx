import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation } from '../types';

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
          ? 'text-brand-400'
          : 'text-red-400'
      }`;
      const bg = cit?.verified ? 'rgba(67,97,238,0.2)' : 'rgba(239,68,68,0.2)';
      return onCiteClick ? (
        <button
          key={i}
          onClick={() => onCiteClick(n)}
          title={cit?.document_name ?? `Source ${n}`}
          className={`${cls} hover:opacity-80 transition-opacity cursor-pointer`}
          style={{ background: bg }}
        >
          {n}
        </button>
      ) : (
        <span key={i} className={cls} style={{ background: bg }}>{n}</span>
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
      <p className="mb-3 last:mb-0 leading-relaxed text-slate-300">{wrap(children)}</p>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed text-slate-300">{wrap(children)}</li>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-slate-400">{children}</em>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-base font-semibold text-white mt-4 mb-2">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-sm font-semibold text-white mt-3 mb-1">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-medium text-slate-200 mt-2 mb-0.5">{children}</h3>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="rounded px-1 py-0.5 text-xs font-mono text-slate-300" style={{ background: 'rgba(51,65,85,0.6)' }}>{children}</code>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-slate-600 pl-3 my-2 text-slate-400 italic">{children}</blockquote>
    ),
  } as Parameters<typeof ReactMarkdown>[0]['components'];

  return (
    <div className={`text-sm text-slate-300 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
