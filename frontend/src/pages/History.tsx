import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import type { QueryHistoryItem } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

const cardBorder = 'rgba(51,65,85,0.5)';

export default function History() {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.query.history(100).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 space-y-5">
      <div className="space-y-1.5">
        <Sk className="h-6 w-36" />
        <Sk className="h-4 w-20" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.5)' }}>
              {[48, 28, 20, 28, 20].map((w, i) => (
                <th key={i} className="px-5 py-3"><Sk className="h-3" style={{ width: `${w}px` }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[75, 55, 65, 45, 70, 60, 50].map((w, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(51,65,85,0.25)' }}>
                <td className="px-5 py-3.5"><Sk className="h-3.5" style={{ width: `${w}%` }} /></td>
                <td className="px-5 py-3.5"><Sk className="h-5 w-16 rounded-full" /></td>
                <td className="px-5 py-3.5"><Sk className="h-3.5 w-5" /></td>
                <td className="px-5 py-3.5"><Sk className="h-3.5 w-32" /></td>
                <td className="px-5 py-3.5"><Sk className="h-3.5 w-12" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Query History</h1>
        <p className="text-sm text-slate-500 mt-0.5">{items.length} queries</p>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(67,97,238,0.1)' }}>
            <Search className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-sm">No queries yet. Go to Ask to get started.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${cardBorder}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: 'rgba(30,41,59,0.5)' }}>
                <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-left uppercase tracking-wide">Query</th>
                <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-left uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-left uppercase tracking-wide">Sources</th>
                <th className="px-5 py-3 font-semibold text-slate-400 text-xs text-left uppercase tracking-wide">Time</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-5 py-3 text-slate-300 max-w-md">
                    <p className="truncate">{item.query}</p>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-3 text-slate-500">{item.source_count}</td>
                  <td className="px-5 py-3 text-slate-600 whitespace-nowrap text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => navigate(`/inspector?query=${item.id}`)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
