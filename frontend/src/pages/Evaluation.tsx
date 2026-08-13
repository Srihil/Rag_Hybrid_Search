import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, RefreshCw, Upload, FileJson } from 'lucide-react';
import { api } from '../api/client';
import type { EvalResult } from '../types';
import { Sk } from '../components/Skeleton';

const STRATEGY_LABELS: Record<string, string> = {
  bm25: 'BM25',
  dense: 'Dense',
  hybrid: 'Hybrid (RRF)',
  hybrid_reranked: 'Hybrid + Reranker',
};

const cardBg = 'rgba(15,23,42,0.8)';
const cardBorder = 'rgba(51,65,85,0.5)';
const sectionBg = 'rgba(30,41,59,0.4)';

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(51,65,85,0.8)',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: 12,
};

export default function Evaluation() {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [datasetCount, setDatasetCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setResults(await api.evaluation.results()); } catch { /* no results yet */ }
    setLoading(false);
  };

  const loadDatasetCount = async () => {
    try { const items = await api.evaluation.dataset(); setDatasetCount(items.length); }
    catch { setDatasetCount(0); }
  };

  useEffect(() => { load(); loadDatasetCount(); }, []);

  const runEval = async () => {
    setRunning(true);
    setError(null);
    try { const r = await api.evaluation.run(); setResults(r); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Evaluation failed'); }
    setRunning(false);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items.length === 0) throw new Error('JSON file is empty');
      const result = await api.evaluation.bulkImport(items);
      setImportResult(`Imported ${result.imported} question${result.imported !== 1 ? 's' : ''} successfully`);
      loadDatasetCount();
    } catch (e: unknown) {
      setError(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const chartData = results.map(r => ({
    strategy: STRATEGY_LABELS[r.strategy] ?? r.strategy,
    'Recall@5': r.recall_at_5,
    'Hit Rate': r.hit_rate,
    MRR: r.mrr,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Evaluation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Compare retrieval strategies on your evaluation dataset</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 rounded-lg transition-colors hover:text-white"
            style={{ background: 'rgba(30,41,59,0.6)', border: `1px solid ${cardBorder}` }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={runEval}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #4361ee, #3451d1)' }}
          >
            <Play className="w-4 h-4" />
            {running ? 'Running…' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {/* Dataset import */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: cardBg, borderColor: cardBorder }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Evaluation Dataset</h2>
            <div className="mt-0.5">
              {datasetCount === null
                ? <Sk className="h-3.5 w-32 mt-1" />
                : <p className="text-xs text-slate-500">{datasetCount} question{datasetCount !== 1 ? 's' : ''} in dataset</p>
              }
            </div>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 rounded-lg transition-colors hover:text-white disabled:opacity-50"
            style={{ background: 'rgba(30,41,59,0.6)', border: `1px solid ${cardBorder}` }}
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing…' : 'Import JSON'}
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </div>

        {importResult && (
          <div className="px-3 py-2.5 rounded-lg text-sm text-green-400" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            {importResult}
          </div>
        )}

        <div className="rounded-lg p-4" style={{ background: 'rgba(10,15,30,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
          <div className="flex items-start gap-2 mb-2">
            <FileJson className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium text-slate-500">Expected JSON format</p>
          </div>
          <pre className="text-xs text-slate-500 overflow-x-auto font-mono">{`[
  {
    "question": "Who can work remotely?",
    "expected_chunk_ids": ["<chunk-id-1>", "<chunk-id-2>"],
    "notes": "optional description"
  }
]`}</pre>
          <p className="text-xs text-slate-600 mt-2">
            Get chunk IDs from the Inspector page — hover a chunk to see its ID.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {results.length === 0 && loading && (
        <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: sectionBg }}>
                {[60, 48, 40, 32, 48].map((w, i) => (
                  <th key={i} className="px-5 py-3 text-left"><Sk className="h-3" style={{ width: `${w}px` }} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                  <td className="px-5 py-3.5"><Sk className="h-3.5 w-32" /></td>
                  <td className="px-5 py-3.5 text-right"><Sk className="h-3.5 w-14 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right"><Sk className="h-3.5 w-14 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right"><Sk className="h-3.5 w-14 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right"><Sk className="h-3.5 w-10 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-16 rounded-xl" style={{ border: '2px dashed rgba(67,97,238,0.2)', background: 'rgba(67,97,238,0.03)' }}>
          <p className="text-sm text-slate-500">No evaluation results yet.</p>
          <p className="text-xs text-slate-600 mt-1">Import an evaluation dataset above, then click Run Evaluation.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Metrics table */}
          <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: sectionBg }}>
                  <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-left uppercase tracking-wide">Strategy</th>
                  <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-right uppercase tracking-wide">Recall@5</th>
                  <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-right uppercase tracking-wide">Hit Rate</th>
                  <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-right uppercase tracking-wide">MRR</th>
                  <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-right uppercase tracking-wide">Questions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={r.strategy}
                    style={{
                      borderBottom: '1px solid rgba(51,65,85,0.3)',
                      background: i === results.length - 1 ? 'rgba(34,197,94,0.05)' : 'transparent',
                    }}
                  >
                    <td className="px-5 py-3 font-medium text-slate-200">
                      {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                      {i === results.length - 1 && (
                        <span className="ml-2 text-xs text-green-400 px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(34,197,94,0.12)' }}>best</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-300">{(r.recall_at_5 * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-300">{(r.hit_rate * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-300">{r.mrr.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{r.question_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Strategy Comparison</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="strategy" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(67,97,238,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Recall@5" fill="#4361ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hit Rate" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MRR"      fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-slate-600">
            Metrics at K=5. Recall@5: fraction of relevant chunks in top-5. Hit Rate: at least 1 relevant in top-5. MRR: reciprocal rank of first relevant result.
          </p>
        </>
      )}
    </div>
  );
}
