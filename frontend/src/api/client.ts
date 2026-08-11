import type {
  Document,
  DocumentChunk,
  QueryResponse,
  QueryHistoryItem,
  QueryDetail,
  EvalResult,
  SystemStatus,
} from '../types';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  // 204 No Content (e.g. DELETE) has no body — don't call .json()
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json();
}

// Documents
export const api = {
  documents: {
    upload: async (file: File): Promise<Document> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    },

    list: (): Promise<Document[]> => request('/documents/'),

    get: (id: string): Promise<Document> => request(`/documents/${id}`),

    status: (id: string): Promise<{ id: string; status: string; chunk_count: number; error_message: string | null }> =>
      request(`/documents/${id}/status`),

    chunks: (id: string): Promise<DocumentChunk[]> => request(`/documents/${id}/chunks`),

    delete: (id: string): Promise<void> =>
      request(`/documents/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }),
  },

  query: {
    ask: (query: string, documentId?: string): Promise<QueryResponse> =>
      request('/query/', {
        method: 'POST',
        body: JSON.stringify({ query, document_id: documentId }),
      }),

    history: (limit = 50): Promise<QueryHistoryItem[]> =>
      request(`/query/history?limit=${limit}`),

    get: (id: string): Promise<QueryDetail> => request(`/query/${id}`),
  },

  evaluation: {
    run: (): Promise<EvalResult[]> => request('/evaluation/run', { method: 'POST' }),
    results: (): Promise<EvalResult[]> => request('/evaluation/results'),
    dataset: (): Promise<Array<{ id: string; question: string; expected_chunk_ids: string[]; notes: string }>> =>
      request('/evaluation/dataset'),
  },

  system: {
    health: (): Promise<{ status: string }> => request('/health'),
    status: (): Promise<SystemStatus> => request('/status'),
    stats: (): Promise<{ total_documents: number; total_chunks: number; total_queries: number; processing: number }> =>
      request('/stats'),
  },
};
