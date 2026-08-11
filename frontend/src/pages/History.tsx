import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import type { QueryHistoryItem } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function History() {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.query.history(100).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Query History</h1>
        <p className="text-sm text-gray-500 mt-0.5">{items.length} queries</p>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No queries yet. Go to Ask to get started.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
              <th className="px-5 py-3 font-medium text-gray-500 text-xs">Query</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs">Status</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs">Sources</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs">Time</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-700 max-w-md">
                  <p className="truncate">{item.query}</p>
                </td>
                <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-5 py-3 text-gray-500">{item.source_count}</td>
                <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => navigate(`/inspector?query=${item.id}`)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
