import { useEffect, useState } from 'react';
import { FileText, MessageSquare, Database, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import type { QueryHistoryItem, SystemStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

interface Stats {
  total_documents: number;
  total_chunks: number;
  total_queries: number;
  processing: number;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ServiceDot({ status }: { status: string }) {
  const color =
    status === 'ok' || status === 'loaded'
      ? 'bg-green-500'
      : status === 'disabled'
      ? 'bg-gray-400'
      : status === 'not_loaded' || status === 'unreachable' || status === 'starting'
      ? 'bg-yellow-500'
      : 'bg-red-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queries, setQueries] = useState<QueryHistoryItem[]>([]);
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.system.stats(),
      api.query.history(5),
      api.system.status(),
    ])
      .then(([s, q, sys]) => {
        setStats(s);
        setQueries(q);
        setSysStatus(sys);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your document intelligence platform</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={FileText}       label="Documents"       value={stats?.total_documents ?? 0}          color="bg-brand-600" />
        <StatCard icon={Database}       label="Chunks indexed"  value={(stats?.total_chunks ?? 0).toLocaleString()} color="bg-indigo-500" />
        <StatCard icon={MessageSquare}  label="Total queries"   value={stats?.total_queries ?? 0}            color="bg-violet-500" />
        <StatCard icon={AlertCircle}    label="Processing"      value={stats?.processing ?? 0}               color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent queries */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Recent Queries</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {queries.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No queries yet</p>
            )}
            {queries.map(q => (
              <div key={q.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <p className="text-sm text-gray-700 truncate flex-1">{q.query}</p>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">System Status</h2>
          </div>
          {sysStatus && (
            <div className="p-5 space-y-3">
              {sysStatus.services.map(s => (
                <div key={s.name} className="flex items-center justify-between" title={s.detail || undefined}>
                  <div className="flex items-center gap-2">
                    <ServiceDot status={s.status} />
                    <span className="text-sm text-gray-700 capitalize">{s.name.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={`text-xs ${s.status === 'disabled' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-500">
                  LLM: <span className="text-gray-700">{sysStatus.llm_provider} / {sysStatus.llm_model}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Embedder: <span className="text-gray-700">{sysStatus.embedding_model}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Reranker: <span className="text-gray-700">{sysStatus.reranker_model}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
