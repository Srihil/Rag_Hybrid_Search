import { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, Trash2, ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import type { Document, DocumentChunk } from '../types';
import StatusBadge from '../components/StatusBadge';

function formatBytes(n: number | null) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentRow({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleChunks = async () => {
    if (!expanded && chunks.length === 0 && doc.status === 'completed') {
      setLoadingChunks(true);
      try {
        const c = await api.documents.chunks(doc.id);
        setChunks(c);
      } catch { /* ignore */ }
      setLoadingChunks(false);
    }
    setExpanded(e => !e);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api.documents.delete(doc.id); onDelete(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-white flex items-center gap-3">
        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
          <p className="text-xs text-gray-500">
            {doc.file_type.toUpperCase()} · {formatBytes(doc.file_size)} ·{' '}
            {doc.chunk_count} chunks {doc.page_count ? `· ${doc.page_count} pages` : ''}
          </p>
        </div>
        <StatusBadge status={doc.status} />
        {doc.status === 'completed' && (
          <button
            onClick={toggleChunks}
            className="text-gray-400 hover:text-gray-600 ml-1"
            title="View chunks"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={handleDelete}
          className={`ml-1 text-sm px-2 py-1 rounded transition-colors ${
            confirmDelete
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'text-gray-400 hover:text-red-500'
          }`}
        >
          {confirmDelete ? 'Confirm?' : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {doc.error_message && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{doc.error_message}</p>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 max-h-72 overflow-y-auto bg-gray-50">
          {loadingChunks && <p className="px-4 py-3 text-sm text-gray-500">Loading chunks…</p>}
          {!loadingChunks && chunks.map(c => (
            <div key={c.id} className="px-4 py-2.5 border-b border-gray-100 last:border-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500">#{c.chunk_index}</span>
                {c.page_number && <span className="text-xs text-gray-400">p.{c.page_number}</span>}
                {c.section_heading && (
                  <span className="text-xs text-brand-600 font-medium truncate max-w-xs">{c.section_heading}</span>
                )}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{c.text}</p>
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
    try { setDocs(await api.documents.list()); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any document is processing
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
      try {
        await api.documents.upload(file);
      } catch (e: any) {
        setError(e.message);
      }
    }
    setUploading(false);
    load();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} indexed</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
      >
        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Drop PDF, DOCX, or TXT files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Max 50 MB per file</p>
      </div>

      {docs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No documents yet. Upload one to get started.</p>
      )}

      <div className="space-y-2">
        {docs.map(d => (
          <DocumentRow key={d.id} doc={d} onDelete={load} />
        ))}
      </div>
    </div>
  );
}
