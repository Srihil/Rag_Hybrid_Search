import { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, Trash2, ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import type { Document, DocumentChunk } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

function formatBytes(n: number | null) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const cardBg = 'rgba(15,23,42,0.8)';
const cardBorder = 'rgba(51,65,85,0.5)';
const sectionBg = 'rgba(30,41,59,0.4)';

function DocumentRow({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleChunks = async () => {
    if (!expanded && chunks.length === 0 && doc.status === 'completed') {
      setLoadingChunks(true);
      try { const c = await api.documents.chunks(doc.id); setChunks(c); }
      catch { /* ignore */ }
      setLoadingChunks(false);
    }
    setExpanded(e => !e);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api.documents.delete(doc.id); onDelete(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: cardBorder }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: cardBg }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(67,97,238,0.15)' }}>
          <FileText className="w-4 h-4 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{doc.original_filename}</p>
          <p className="text-xs text-slate-500">
            {doc.file_type.toUpperCase()} · {formatBytes(doc.file_size)} · {doc.chunk_count} chunks
            {doc.page_count ? ` · ${doc.page_count} pages` : ''}
          </p>
        </div>
        <StatusBadge status={doc.status} />
        {doc.status === 'completed' && (
          <button onClick={toggleChunks} className="text-slate-500 hover:text-slate-300 ml-1 transition-colors" title="View chunks">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={handleDelete}
          className={`ml-1 text-sm px-2 py-1 rounded-md transition-colors ${
            confirmDelete ? 'text-red-400 font-medium' : 'text-slate-600 hover:text-red-400'
          }`}
          style={confirmDelete ? { background: 'rgba(239,68,68,0.12)' } : undefined}
        >
          {confirmDelete ? 'Confirm?' : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {doc.error_message && (
        <div className="px-4 py-2 flex gap-2 items-start" style={{ background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-400">{doc.error_message}</p>
        </div>
      )}

      {expanded && (
        <div className="max-h-72 overflow-y-auto" style={{ borderTop: `1px solid ${cardBorder}`, background: 'rgba(10,15,30,0.6)' }}>
          {loadingChunks && (
            <div className="px-4 py-3 space-y-3">
              {[70, 55, 80, 62].map((w, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <Sk className="h-3 w-6" />
                    <Sk className="h-3 w-14" />
                    <Sk className="h-3 w-20" />
                  </div>
                  <Sk className="h-3 ml-6" style={{ width: `${w}%` }} />
                  <Sk className="h-3 ml-6 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {!loadingChunks && chunks.map(c => (
            <div key={c.id} className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-bold text-slate-600">#{c.chunk_index}</span>
                {c.page_number && <span className="text-xs text-slate-600">p.{c.page_number}</span>}
                {c.section_heading && (
                  <span className="text-xs text-brand-400 font-medium truncate max-w-xs">{c.section_heading}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try { setDocs(await api.documents.list()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const hasProcessing = docs.some(d => d.status === 'pending' || d.status === 'processing');
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(load, 3000);
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [docs, load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      try { await api.documents.upload(file); }
      catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    }
    setUploading(false);
    load();
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); handleUpload(e.dataTransfer.files); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} indexed</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #4361ee, #3451d1)' }}
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={e => handleUpload(e.target.files)} />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{ border: '2px dashed rgba(67,97,238,0.25)', background: 'rgba(67,97,238,0.03)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(67,97,238,0.5)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(67,97,238,0.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(67,97,238,0.25)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(67,97,238,0.03)'; }}
      >
        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(67,97,238,0.15)' }}>
          <Upload className="w-5 h-5 text-brand-400" />
        </div>
        <p className="text-sm text-slate-400">Drop PDF, DOCX, or TXT files here, or click to browse</p>
        <p className="text-xs text-slate-600 mt-1">Max 50 MB per file</p>
      </div>

      {docs.length === 0 && (
        <p className="text-sm text-slate-600 text-center py-6">No documents yet. Upload one to get started.</p>
      )}

      <div className="space-y-2">
        {docs.map(d => <DocumentRow key={d.id} doc={d} onDelete={load} />)}
      </div>
    </div>
  );
}
