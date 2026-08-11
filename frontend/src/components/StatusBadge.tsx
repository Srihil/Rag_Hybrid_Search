type Status = 'pending' | 'processing' | 'completed' | 'failed' | 'insufficient_evidence' | string;

const styles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  insufficient_evidence: 'bg-orange-100 text-orange-700',
};

export default function StatusBadge({ status }: { status: Status }) {
  const cls = styles[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
