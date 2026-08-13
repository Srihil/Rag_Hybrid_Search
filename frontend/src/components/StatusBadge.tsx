type Status = 'pending' | 'processing' | 'completed' | 'failed' | 'insufficient_evidence' | string;

const styles: Record<string, string> = {
  pending:               'text-slate-400',
  processing:            'text-amber-400',
  completed:             'text-green-400',
  failed:                'text-red-400',
  insufficient_evidence: 'text-orange-400',
};

const bgStyles: Record<string, string> = {
  pending:               'rgba(100,116,139,0.15)',
  processing:            'rgba(245,158,11,0.15)',
  completed:             'rgba(34,197,94,0.15)',
  failed:                'rgba(239,68,68,0.15)',
  insufficient_evidence: 'rgba(249,115,22,0.15)',
};

export default function StatusBadge({ status }: { status: Status }) {
  const textCls = styles[status] ?? 'text-slate-400';
  const bg = bgStyles[status] ?? 'rgba(100,116,139,0.15)';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textCls}`}
      style={{ background: bg }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
