import { useEffect, useState } from 'react';
import { FileText, MessageSquare, Database, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import type { QueryHistoryItem, SystemStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

interface Stats {
  total_documents: number;
  total_chunks: number;
  total_queries: number;
  processing: number;
}

function StatCard({ icon: Icon, label, value, gradient }: {
  icon: React.ElementType; label: string; value: string | number; gradient: string;
}) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: 'rgba(30,41,59,0.6)', borderColor: 'rgba(51,65,85,0.5)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: gradient }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ServiceDot({ status }: { status: string }) {
  const color =
    status === 'ok' || status === 'loaded'
      ? '#22c55e'
      : status === 'disabled'
      ? '#475569'
      : status === 'not_loaded' || status === 'unreachable' || status === 'starting'
      ? '#f59e0b'
      : '#ef4444';
  return (
    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
  );
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
      .then(([s, q, sys]) => { setStats(s); setQueries(q); setSysStatus(sys); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <Sk className="h-6 w-36" />
          <Sk className="h-4 w-72" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: 'rgba(30,41,59,0.6)', borderColor: 'rgba(51,65,85,0.5)' }}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Sk className="h-3 w-20" />
                  <Sk className="h-7 w-12" />
                </div>
                <Sk className="w-11 h-11 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        {/* Panels */}
        <div className="grid grid-cols-2 gap-5">
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl border overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(51,65,85,0.5)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.4)' }}>
                <Sk className="h-3 w-28" />
              </div>
              <div className="p-5 space-y-3.5">
                {[0, 1, 2, 3, 4].map(j => (
                  <div key={j} className="flex items-center justify-between">
                    <Sk className="h-3.5" style={{ width: `${[48, 64, 56, 72, 52][j]}%` }} />
                    <Sk className="h-3.5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of your document intelligence platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={FileText}      label="Documents"      value={stats?.total_documents ?? 0}                      gradient="linear-gradient(135deg,#4361ee,#3451d1)" />
        <StatCard icon={Database}      label="Chunks indexed" value={(stats?.total_chunks ?? 0).toLocaleString()}      gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
        <StatCard icon={MessageSquare} label="Total queries"  value={stats?.total_queries ?? 0}                        gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" />
        <StatCard icon={AlertCircle}   label="Processing"     value={stats?.processing ?? 0}                           gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Recent queries */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.4)' }}>
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Recent Queries</h2>
          </div>
          <div className="divide-y" style={{ '--tw-divide-color': 'rgba(51,65,85,0.3)' } as React.CSSProperties}>
            {queries.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-600">No queries yet</p>
            )}
            {queries.map(q => (
              <div key={q.id} className="px-5 py-3 flex items-start justify-between gap-3" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
                <p className="text-sm text-slate-300 truncate flex-1">{q.query}</p>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.4)' }}>
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">System Status</h2>
          </div>
          {sysStatus && (
            <div className="p-5 space-y-3">
              {sysStatus.services.map(s => (
                <div key={s.name} className="flex items-center justify-between" title={s.detail || undefined}>
                  <div className="flex items-center gap-2.5">
                    <ServiceDot status={s.status} />
                    <span className="text-sm text-slate-300 capitalize">{s.name.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={`text-xs font-mono ${s.status === 'disabled' ? 'text-slate-600' : 'text-slate-500'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
              <div className="pt-3 space-y-1" style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
                <p className="text-xs text-slate-600">LLM: <span className="text-slate-400">{sysStatus.llm_provider} / {sysStatus.llm_model}</span></p>
                <p className="text-xs text-slate-600">Embedder: <span className="text-slate-400">{sysStatus.embedding_model}</span></p>
                <p className="text-xs text-slate-600">Reranker: <span className="text-slate-400">{sysStatus.reranker_model}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
