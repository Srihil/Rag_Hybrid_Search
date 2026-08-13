import { useEffect, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import MarkdownAnswer from '../components/MarkdownAnswer';
import { api } from '../api/client';
import type { QueryHistoryItem, QueryDetail, RetrievalChunk } from '../types';

const cardBg = 'rgba(15,23,42,0.8)';
const cardBorder = 'rgba(51,65,85,0.5)';
const sectionBg = 'rgba(30,41,59,0.4)';

function StagePanel({ title, subtitle, chunks, scoreKey }: {
  title: string;
  subtitle: string;
  chunks: RetrievalChunk[];
  scoreKey: 'score' | 'rrf_score' | 'rerank_score';
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="px-3 py-2.5" style={{ background: sectionBg, borderBottom: `1px solid ${cardBorder}` }}>
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        <p className="text-xs text-slate-600">{subtitle}</p>
      </div>
      <div className="max-h-72 overflow-y-auto" style={{ '--tw-divide-color': cardBorder } as React.CSSProperties}>
        {chunks.length === 0 && <p className="px-3 py-3 text-xs text-slate-600">No results</p>}
        {chunks.map((c, i) => (
          <div key={c.chunk_id} className="px-3 py-2" style={{ borderBottom: `1px solid rgba(51,65,85,0.3)` }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold text-slate-600 w-4">{i + 1}</span>
              <span className="text-xs text-slate-300 font-medium truncate flex-1">{c.document_name}</span>
              {c[scoreKey] !== undefined && (
                <span className="text-xs font-mono text-brand-400 flex-shrink-0">
                  {typeof c[scoreKey] === 'number' ? (c[scoreKey] as number).toFixed(4) : c[scoreKey]}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 pl-5">
              {c.page_number ? `p.${c.page_number}` : ''}
              {c.section_heading ? ` · ${c.section_heading}` : ''}
            </p>
            {c.text_preview && (
              <p className="text-xs text-slate-500 pl-5 mt-0.5 line-clamp-2">{c.text_preview}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center w-5 flex-shrink-0 mt-8">
      <ChevronRight className="w-4 h-4 text-slate-700" />
    </div>
  );
}

export default function Inspector() {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = () => api.query.history(20).then(setHistory).catch(() => {});

  useEffect(() => { loadHistory(); }, []);

  const loadDetail = async (id: string) => {
    setSelected(id);
    setLoading(true);
    try { setDetail(await api.query.get(id)); }
    catch { setDetail(null); }
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.query.delete(id);
      setHistory(h => h.filter(q => q.id !== id));
      if (selected === id) { setSelected(null); setDetail(null); }
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const trace = detail?.retrieval_trace;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Retrieval Inspector</h1>
        <p className="text-sm text-slate-500 mt-0.5">Trace the full retrieval pipeline for any past query</p>
      </div>

      <div className="flex gap-5">
        {/* Query list */}
        <div className="w-64 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="px-4 py-2.5" style={{ background: sectionBg, borderBottom: `1px solid ${cardBorder}` }}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Query history</p>
          </div>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {history.length === 0 && <p className="px-4 py-3 text-xs text-slate-600">No queries yet</p>}
            {history.map(q => (
              <div
                key={q.id}
                onClick={() => loadDetail(q.id)}
                className="group relative flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid rgba(51,65,85,0.3)',
                  background: selected === q.id ? 'rgba(67,97,238,0.12)' : 'transparent',
                  borderLeft: selected === q.id ? '2px solid #4361ee' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (selected !== q.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,41,59,0.5)'; }}
                onMouseLeave={e => { if (selected !== q.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 line-clamp-2">{q.query}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{new Date(q.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={e => handleDelete(e, q.id)}
                  disabled={deleting === q.id}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  title="Delete query"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline view */}
        <div className="flex-1 min-w-0 space-y-4">
          {!detail && !loading && (
            <div className="flex items-center justify-center h-48 rounded-xl" style={{ border: '2px dashed rgba(67,97,238,0.2)', background: 'rgba(67,97,238,0.03)' }}>
              <p className="text-sm text-slate-600">Select a query to inspect its retrieval trace</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-slate-600 animate-pulse">Loading trace…</p>
            </div>
          )}

          {detail && trace && !loading && (
            <>
              {/* Query */}
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(67,97,238,0.25)' }}>
                <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wide font-medium">Query</p>
                <p className="text-sm text-slate-200">{detail.query}</p>
              </div>

              {/* Pipeline stages */}
              <div className="flex items-start gap-0">
                <StagePanel title="Dense Retrieval"  subtitle="Qdrant cosine similarity" chunks={trace.dense_results}    scoreKey="score" />
                <Arrow />
                <StagePanel title="BM25 Retrieval"   subtitle="Lexical keyword match"    chunks={trace.bm25_results}     scoreKey="score" />
                <Arrow />
                <StagePanel title="RRF Fusion"        subtitle="Reciprocal Rank Fusion"   chunks={trace.rrf_results}      scoreKey="rrf_score" />
                <Arrow />
                <StagePanel title="Reranked"          subtitle="Cross-encoder scores"     chunks={trace.reranked_results} scoreKey="rerank_score" />
              </div>

              {/* Final context */}
              <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: '1px solid rgba(34,197,94,0.25)' }}>
                <div className="px-4 py-2.5" style={{ background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-xs font-semibold text-green-400">Final Context (sent to LLM)</p>
                  <p className="text-xs text-green-600">{trace.final_context.length} evidence chunks</p>
                </div>
                <div>
                  {trace.final_context.map((c, i) => (
                    <div key={c.chunk_id} className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-green-500">[{i + 1}]</span>
                        <span className="text-xs font-medium text-slate-200">{c.document_name}</span>
                        {c.page_number && <span className="text-xs text-slate-500">p.{c.page_number}</span>}
                        {c.section_heading && <span className="text-xs text-brand-400">{c.section_heading}</span>}
                      </div>
                      {c.text_preview && <p className="text-xs text-slate-500 pl-5 line-clamp-3">{c.text_preview}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Generated Answer</p>
                <MarkdownAnswer text={detail.answer} citations={detail.citations} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
