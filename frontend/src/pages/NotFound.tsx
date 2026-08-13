import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(67,97,238,0.2)' }}
      >
        <FileQuestion className="w-8 h-8 text-slate-500" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-all"
        style={{ background: 'linear-gradient(135deg, #4361ee, #3451d1)' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
