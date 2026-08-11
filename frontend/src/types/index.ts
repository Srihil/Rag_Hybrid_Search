export interface Document {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  page_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  text: string;
  page_number: number | null;
  section_heading: string | null;
  token_count: number | null;
}

export interface Citation {
  source_num: number;
  chunk_id: string | null;
  document_name: string | null;
  page_number: number | null;
  section_heading: string | null;
  text_preview: string | null;
  verified: boolean;
}

export interface QueryResponse {
  id: string;
  query: string;
  answer: string;
  citations: Citation[];
  has_sufficient_evidence: boolean;
  source_count: number;
  status: string;
  created_at: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  status: string;
  source_count: number;
  has_sufficient_evidence: boolean;
  created_at: string;
}

export interface RetrievalChunk {
  chunk_id: string;
  document_id?: string;
  document_name?: string;
  page_number?: number | null;
  section_heading?: string | null;
  text_preview?: string;
  score?: number;
  rrf_score?: number;
  rerank_score?: number;
  rank?: number;
}

export interface RetrievalTrace {
  query: string;
  dense_results: RetrievalChunk[];
  bm25_results: RetrievalChunk[];
  rrf_results: RetrievalChunk[];
  reranked_results: RetrievalChunk[];
  final_context: RetrievalChunk[];
}

export interface QueryDetail extends QueryResponse {
  retrieval_trace: RetrievalTrace | null;
}

export interface EvalResult {
  strategy: string;
  recall_at_5: number;
  hit_rate: number;
  mrr: number;
  question_count: number;
  run_at: string;
}

export interface SystemStatus {
  services: Array<{ name: string; status: string; detail: string }>;
  llm_provider: string;
  llm_model: string;
  embedding_model: string;
  reranker_model: string;
}
