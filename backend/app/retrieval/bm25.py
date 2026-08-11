from typing import Optional
from app.retrieval.bm25_store import bm25_store
from app.core.config import settings


def bm25_search(
    query: str,
    top_k: int = None,
    document_id: Optional[str] = None,
) -> list[dict]:
    """
    Keyword search using BM25 over the chunk corpus.
    Returns list of chunk dicts with 'score' key.
    """
    top_k = top_k or settings.retrieval_top_k
    results = bm25_store.search(query, top_k=top_k, document_id=document_id)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results
