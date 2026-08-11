import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import type { QueryHistoryItem, QueryDetail, RetrievalChunk } from '../types';

function StagePanel({ title, subtitle, chunks, scoreKey }: {
  title: string;
  subtitle: string;
  chunks: RetrievalChunk[];
  scoreKey: 'score' | 'rrf_score' | 'rerank_score';
}) {
  return (
    <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {chunks.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No results</p>}
        {chunks.map((c, i) => (
          <div key={c.chunk_id} className="px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
              <span className="text-xs text-gray-700 font-medium truncate flex-1">{c.document_name}</span>
              {c[scoreKey] !== undefined && (
                <span className="text-xs font-mono text-brand-600 flex-shrink-0">
                  {typeof c[scoreKey] === 'number' ? (c[scoreKey] as number).toFixed(4) : c[scoreKey]}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 pl-5">
              {c.page_number ? `p.${c.page_number}` : ''}
              {c.section_heading ? ` · ${c.section_heading}` : ''}
            </p>
            {c.text_preview && (
              <p className="text-xs text-gray-500 pl-5 mt-0.5 line-clamp-2">{c.text_preview}</p>
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
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </div>
  );
}

export default function Inspector() {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.query.history(20).then(setHistory).catch(() => {});
  }, []);

  const loadDetail = async (id: string) => {
    setSelected(id);
    setLoading(true);
    try {
      setDetail(await api.query.get(id));
    } catch { setDetail(null); }
    setLoading(false);
  };

  const trace = detail?.retrieval_trace;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Retrieval Inspector</h1>
        <p className="text-sm text-gray-500 mt-0.5">Trace the full retrieval pipeline for any past query</p>
      </div>

      <div className="flex gap-5">
        {/* Query list */}
        <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600">Query history</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[calc(100vh-200px)] overflow-y-auto">
            {history.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">No queries yet</p>}
            {history.map(q => (
              <button
                key={q.id}
                onClick={() => loadDetail(q.id)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                  selected === q.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                }`}
              >
                <p className="text-xs text-gray-700 line-clamp-2">{q.query}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(q.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline view */}
        <div className="flex-1 min-w-0 space-y-4">
          {!detail && !loading && (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm text-gray-400">Select a query to inspect its retrieval trace</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-gray-400 animate-pulse">Loading trace…</p>
            </div>
          )}

          {detail && trace && !loading && (
            <>
              {/* Query */}
              <div className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Query</p>
                <p className="text-sm">{detail.query}</p>
              </div>

              {/* Pipeline stages */}
              <div className="flex items-start gap-0">
                <StagePanel
                  title="Dense Retrieval"
                  subtitle="Qdrant cosine similarity"
                  chunks={trace.dense_results}
                  scoreKey="score"
                />
                <Arrow />
                <StagePanel
                  title="BM25 Retrieval"
                  subtitle="Lexical keyword match"
                  chunks={trace.bm25_results}
                  scoreKey="score"
                />
                <Arrow />
                <StagePanel
                  title="RRF Fusion"
                  subtitle="Reciprocal Rank Fusion"
                  chunks={trace.rrf_results}
                  scoreKey="rrf_score"
                />
                <Arrow />
                <StagePanel
                  title="Reranked"
                  subtitle="Cross-encoder scores"
                  chunks={trace.reranked_results}
                  scoreKey="rerank_score"
                />
              </div>

              {/* Final context */}
              <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 border-b border-green-200">
                  <p className="text-xs font-semibold text-green-800">Final Context (sent to LLM)</p>
                  <p className="text-xs text-green-600">{trace.final_context.length} evidence chunks</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {trace.final_context.map((c, i) => (
                    <div key={c.chunk_id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-green-600">[{i + 1}]</span>
                        <span className="text-xs font-medium text-gray-800">{c.document_name}</span>
                        {c.page_number && <span className="text-xs text-gray-400">p.{c.page_number}</span>}
                        {c.section_heading && <span className="text-xs text-brand-600">{c.section_heading}</span>}
                      </div>
                      {c.text_preview && <p className="text-xs text-gray-600 pl-5 line-clamp-3">{c.text_preview}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Generated Answer</p>
                <p className="text-sm text-gray-800 leading-relaxed">{detail.answer}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
