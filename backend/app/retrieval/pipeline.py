from dataclasses import dataclass, field, asdict
from typing import Optional
from app.retrieval.dense import dense_search
from app.retrieval.bm25 import bm25_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.reranker import reranker
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RetrievalTrace:
    query: str
    dense_results: list[dict] = field(default_factory=list)
    bm25_results: list[dict] = field(default_factory=list)
    rrf_results: list[dict] = field(default_factory=list)
    reranked_results: list[dict] = field(default_factory=list)
    final_context: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def run_retrieval_pipeline(
    query: str,
    top_k: int = None,
    rerank_top_k: int = None,
    document_id: Optional[str] = None,
) -> RetrievalTrace:
    """
    Full hybrid retrieval pipeline:
      1. Dense (vector) retrieval via Qdrant
      2. BM25 (lexical) retrieval
      3. Reciprocal Rank Fusion
      4. Cross-encoder reranking
      5. Final top-K selection
    Returns a RetrievalTrace with every intermediate step preserved.
    """
    top_k = top_k or settings.retrieval_top_k
    rerank_top_k = rerank_top_k or settings.rerank_top_k

    trace = RetrievalTrace(query=query)

    logger.info("retrieval_start", query=query[:80], top_k=top_k)

    # Step 1: Dense retrieval
    dense_results = dense_search(query, top_k=top_k, document_id=document_id)
    trace.dense_results = _slim(dense_results)
    logger.info("dense_retrieved", count=len(dense_results))

    # Step 2: BM25 retrieval
    bm25_results = bm25_search(query, top_k=top_k, document_id=document_id)
    trace.bm25_results = _slim(bm25_results)
    logger.info("bm25_retrieved", count=len(bm25_results))

    # Step 3: RRF fusion
    rrf_results = reciprocal_rank_fusion([dense_results, bm25_results])
    trace.rrf_results = _slim(rrf_results)
    logger.info("rrf_fused", count=len(rrf_results))

    # Step 4: Rerank top candidates
    candidates_for_rerank = rrf_results[: min(len(rrf_results), top_k)]
    reranked = reranker.rerank(query, candidates_for_rerank, top_k=rerank_top_k)
    trace.reranked_results = _slim(reranked)
    logger.info("reranked", count=len(reranked))

    # Step 5: Final context = top reranked results
    trace.final_context = reranked[:rerank_top_k]
    logger.info("retrieval_complete", final_count=len(trace.final_context))

    return trace


def _slim(results: list[dict]) -> list[dict]:
    """Remove full text from trace to keep the stored JSON manageable."""
    slimmed = []
    for r in results:
        entry = {k: v for k, v in r.items() if k != "text"}
        text = r.get("text", "")
        entry["text_preview"] = text[:200] + "..." if len(text) > 200 else text
        slimmed.append(entry)
    return slimmed
