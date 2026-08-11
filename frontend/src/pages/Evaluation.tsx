import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { EvalResult } from '../types';

const STRATEGY_LABELS: Record<string, string> = {
  bm25: 'BM25',
  dense: 'Dense',
  hybrid: 'Hybrid (RRF)',
  hybrid_reranked: 'Hybrid + Reranker',
};

const STRATEGY_COLORS = ['#94a3b8', '#6366f1', '#3b82f6', '#10b981'];

export default function Evaluation() {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setResults(await api.evaluation.results()); }
    catch { /* no results yet */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runEval = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api.evaluation.run();
      setResults(r);
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
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
          <h1 className="text-xl font-semibold text-gray-900">Evaluation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compare retrieval strategies on your evaluation dataset</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={runEval} disabled={running} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Play className="w-4 h-4" />
            {running ? 'Running…' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">No evaluation results yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add evaluation questions via the API, then click Run Evaluation.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Metrics table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs">Strategy</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs text-right">Recall@5</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs text-right">Hit Rate</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs text-right">MRR</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs text-right">Questions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <tr key={r.strategy} className={i === results.length - 1 ? 'bg-green-50' : ''}>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                      {i === results.length - 1 && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">best</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{(r.recall_at_5 * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{(r.hit_rate * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{r.mrr.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{r.question_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Strategy Comparison</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Recall@5" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Hit Rate" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="MRR" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-400">
            Metrics computed at K=5. Recall@5: fraction of relevant chunks in top-5. Hit Rate: at least 1 relevant in top-5. MRR: reciprocal rank of first relevant result.
          </p>
        </>
      )}
    </div>
  );
}
