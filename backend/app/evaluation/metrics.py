"""
Pure functions for information retrieval evaluation metrics.
All functions operate on lists and return floats — no I/O, easy to test.
"""


def recall_at_k(retrieved_ids: list[str], relevant_ids: list[str], k: int) -> float:
    """Fraction of relevant chunks found in the top-K retrieved results."""
    if not relevant_ids:
        return 0.0
    top_k = set(retrieved_ids[:k])
    hits = sum(1 for r in relevant_ids if r in top_k)
    return hits / len(relevant_ids)


def hit_rate_at_k(retrieved_ids: list[str], relevant_ids: list[str], k: int) -> float:
    """1.0 if at least one relevant chunk appears in top-K, else 0.0."""
    if not relevant_ids:
        return 0.0
    top_k = set(retrieved_ids[:k])
    return 1.0 if any(r in top_k for r in relevant_ids) else 0.0


def mean_reciprocal_rank(retrieved_ids: list[str], relevant_ids: list[str]) -> float:
    """
    Reciprocal rank of the first relevant result.
    MRR = 1/rank of first hit, or 0 if no hit.
    """
    relevant_set = set(relevant_ids)
    for i, rid in enumerate(retrieved_ids, start=1):
        if rid in relevant_set:
            return 1.0 / i
    return 0.0


def average_metrics(metric_values: list[float]) -> float:
    if not metric_values:
        return 0.0
    return sum(metric_values) / len(metric_values)
