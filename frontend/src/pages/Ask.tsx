import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import type { Document, QueryResponse, Citation } from '../types';
import MarkdownAnswer from '../components/MarkdownAnswer';
import { Sk } from '../components/Skeleton';

const cardBorder = 'rgba(51,65,85,0.5)';
const borderColor = cardBorder;

function CitationCard({ c, expanded, onToggle, cardRef }: {
  c: Citation;
  expanded: boolean;
  onToggle: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={cardRef} className="rounded-xl overflow-hidden transition-all" style={{ border: `1px solid ${cardBorder}` }}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
        style={{ background: 'rgba(15,23,42,0.8)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.8)')}
      >
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0 ${
            c.verified ? 'text-brand-400' : 'text-red-400'
          }`}
          style={{ background: c.verified ? 'rgba(67,97,238,0.2)' : 'rgba(239,68,68,0.2)' }}
        >
          {c.source_num}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{c.document_name}</p>
          <p className="text-xs text-slate-500">
            {c.page_number ? `Page ${c.page_number}` : ''}
            {c.section_heading ? ` · ${c.section_heading}` : ''}
            {!c.verified && <span className="text-red-400 ml-2">unverified</span>}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />}
      </button>
      {expanded && c.text_preview && (
        <div className="px-4 pb-4 pt-2" style={{ background: 'rgba(10,15,30,0.6)', borderTop: `1px solid ${cardBorder}` }}>
          <p className="text-xs text-slate-400 leading-relaxed">{c.text_preview}</p>
        </div>
      )}
    </div>
  );
}

function AnswerDisplay({ result }: { result: QueryResponse }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleCiteClick = useCallback((n: number) => {
    setExpanded(prev => { const next = new Set(prev); next.add(n); return next; });
    setTimeout(() => { cardRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
  }, []);

  const toggleCite = useCallback((n: number) => {
    setExpanded(prev => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });
  }, []);

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl p-5 border"
        style={result.has_sufficient_evidence
          ? { background: 'rgba(15,23,42,0.8)', borderColor: cardBorder }
          : { background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }
        }
      >
        {!result.has_sufficient_evidence && (
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-400">Insufficient evidence — answer may be incomplete</span>
          </div>
        )}
        <MarkdownAnswer text={result.answer} citations={result.citations} onCiteClick={handleCiteClick} />
      </div>

      {result.citations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Sources · click a citation number above to expand
          </h3>
          <div className="space-y-1.5">
            {result.citations.map(c => (
              <CitationCard
                key={c.source_num}
                c={c}
                expanded={expanded.has(c.source_num)}
                onToggle={() => toggleCite(c.source_num)}
                cardRef={el => { cardRefs.current[c.source_num] = el; }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Ask() {
  const [query, setQuery] = useState('');
  const [docFilter, setDocFilter] = useState('');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documents.list().then(d => setDocs(d.filter(doc => doc.status === 'completed'))).catch(() => {});
  }, []);

  const submit = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.query.ask(query.trim(), docFilter || undefined);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Ask a Question</h1>
        <p className="text-sm text-slate-500 mt-0.5">Answers are grounded in your documents with verified citations</p>
      </div>

      {/* Query box */}
      <div className="rounded-xl border p-4 space-y-3" style={{ background: 'rgba(15,23,42,0.8)', borderColor: cardBorder }}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="What is the company's parental leave policy?"
          rows={3}
          className="w-full text-sm text-slate-200 placeholder-slate-600 resize-none border-0 outline-none bg-transparent"
        />
        <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(51,65,85,0.4)', paddingTop: '0.75rem' }}>
          <select
            value={docFilter}
            onChange={e => setDocFilter(e.target.value)}
            className="text-sm text-slate-400 rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.6)' }}
          >
            <option value="">All documents</option>
            {docs.map(d => <option key={d.id} value={d.id}>{d.original_filename}</option>)}
          </select>
          <button
            onClick={submit}
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg, #4361ee, #3451d1)' }}
          >
            <Send className="w-4 h-4" />
            {loading ? 'Searching…' : 'Ask'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {/* Answer card skeleton */}
          <div className="rounded-xl p-5 border space-y-3" style={{ background: 'rgba(15,23,42,0.8)', borderColor }}>
            <Sk className="h-4 w-full" />
            <Sk className="h-4 w-11/12" />
            <Sk className="h-4 w-4/5" />
            <Sk className="h-4 w-5/6" />
            <Sk className="h-4 w-full mt-1" />
            <Sk className="h-4 w-3/4" />
            <Sk className="h-4 w-2/3" />
          </div>
          {/* Citation skeletons */}
          <div>
            <Sk className="h-3 w-52 mb-3" />
            <div className="space-y-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${borderColor}` }}>
                  <div className="px-4 py-2.5 flex items-center gap-3">
                    <Sk className="w-6 h-6 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Sk className="h-3.5 w-40" />
                      <Sk className="h-3 w-24" />
                    </div>
                    <Sk className="w-4 h-4 rounded flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && <AnswerDisplay result={result} />}
    </div>
  );
}
