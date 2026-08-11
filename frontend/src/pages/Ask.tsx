import { useState, useEffect } from 'react';
import { Send, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import type { Document, QueryResponse, Citation } from '../types';

function CitationCard({ c }: { c: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0 ${
          c.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          {c.source_num}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{c.document_name}</p>
          <p className="text-xs text-gray-500">
            {c.page_number ? `Page ${c.page_number}` : ''}
            {c.section_heading ? ` · ${c.section_heading}` : ''}
            {!c.verified && <span className="text-red-500 ml-2">⚠ unverified</span>}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && c.text_preview && (
        <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed mt-2">{c.text_preview}</p>
        </div>
      )}
    </div>
  );
}

function AnswerDisplay({ result }: { result: QueryResponse }) {
  const parts = result.answer.split(/(\[\d+\])/g);

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 border ${
        result.has_sufficient_evidence
          ? 'bg-white border-gray-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        {!result.has_sufficient_evidence && (
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Insufficient evidence</span>
          </div>
        )}
        <p className="text-sm text-gray-800 leading-relaxed">
          {parts.map((part, i) => {
            const m = part.match(/^\[(\d+)\]$/);
            if (m) {
              const n = parseInt(m[1]);
              const citation = result.citations.find(c => c.source_num === n);
              return (
                <sup key={i} className={`font-bold cursor-pointer ${
                  citation?.verified ? 'text-brand-600' : 'text-red-500'
                }`}>{part}</sup>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>

      {result.citations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sources</h3>
          <div className="space-y-1.5">
            {result.citations.map(c => <CitationCard key={c.source_num} c={c} />)}
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
    api.documents.list()
      .then(d => setDocs(d.filter(doc => doc.status === 'completed')))
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.query.ask(query.trim(), docFilter || undefined);
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Ask a Question</h1>
        <p className="text-sm text-gray-500 mt-0.5">Answers are grounded in your documents with verified citations</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="What is the company's parental leave policy?"
          rows={3}
          className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none border-0 outline-none"
        />
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <select
            value={docFilter}
            onChange={e => setDocFilter(e.target.value)}
            className="text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1.5 outline-none"
          >
            <option value="">All documents</option>
            {docs.map(d => (
              <option key={d.id} value={d.id}>{d.original_filename}</option>
            ))}
          </select>
          <button
            onClick={submit}
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Searching…' : 'Ask'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="text-center py-10 text-sm text-gray-400 animate-pulse">
          Running hybrid retrieval pipeline…
        </div>
      )}

      {result && <AnswerDisplay result={result} />}
    </div>
  );
}
