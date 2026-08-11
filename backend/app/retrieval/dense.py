from typing import Optional
from app.embeddings.embedder import embedder
from app.retrieval.vector_store import vector_store
from app.core.config import settings


def dense_search(
    query: str,
    top_k: int = None,
    document_id: Optional[str] = None,
) -> list[dict]:
    """
    Embeds the query and retrieves nearest vectors from Qdrant.
    Returns list of chunk dicts with 'score' key.
    """
    top_k = top_k or settings.retrieval_top_k
    query_vector = embedder.embed_one(query)
    results = vector_store.search(query_vector, top_k=top_k, document_id=document_id)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results
