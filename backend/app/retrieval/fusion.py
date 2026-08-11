from collections import defaultdict
from app.core.config import settings


def reciprocal_rank_fusion(
    ranked_lists: list[list[dict]],
    k: int = None,
) -> list[dict]:
    """
    Combine multiple ranked lists using Reciprocal Rank Fusion.

    RRF score for document d = Σ 1 / (k + rank_i(d))
    where rank_i(d) is d's 1-based position in list i.

    k=60 is the standard constant from the original RRF paper (Cormack et al., 2009).
    A higher k reduces the penalty for lower-ranked documents.

    Returns a merged, re-ranked list of chunk dicts with 'rrf_score' added.
    The original scores from each retriever are preserved in the result.
    """
    k = k or settings.rrf_k

    rrf_scores: dict[str, float] = defaultdict(float)
    chunk_registry: dict[str, dict] = {}

    for ranked_list in ranked_lists:
        for rank, chunk in enumerate(ranked_list, start=1):
            chunk_id = chunk["chunk_id"]
            rrf_scores[chunk_id] += 1.0 / (k + rank)
            if chunk_id not in chunk_registry:
                chunk_registry[chunk_id] = chunk

    fused = []
    for chunk_id, rrf_score in sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True):
        entry = dict(chunk_registry[chunk_id])
        entry["rrf_score"] = round(rrf_score, 6)
        entry.pop("score", None)
        fused.append(entry)

    for i, entry in enumerate(fused):
        entry["rank"] = i + 1

    return fused
