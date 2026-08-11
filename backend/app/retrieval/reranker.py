from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Reranker:
    def __init__(self):
        self._model = None
        self._disabled = False

    def is_loaded(self) -> bool:
        return self._model is not None

    def _load(self):
        if self._disabled or self._model is not None:
            return
        try:
            logger.info("loading_reranker_model", model=settings.reranker_model)
            from fastembed.rerank.cross_encoder import TextCrossEncoder
            self._model = TextCrossEncoder(settings.reranker_model)
            logger.info("reranker_model_loaded", model=settings.reranker_model)
        except Exception as e:
            logger.warning("reranker_load_failed_using_rrf_only", error=str(e))
            self._disabled = True

    def rerank(self, query: str, candidates: list[dict], top_k: int = None) -> list[dict]:
        if not candidates:
            return []

        top_k = top_k or settings.rerank_top_k
        self._load()

        if self._disabled:
            # No cross-encoder available — return top-K from RRF as-is
            for i, chunk in enumerate(candidates[:top_k]):
                chunk = dict(chunk)
                chunk["rerank_score"] = chunk.get("rrf_score", 0.0)
                chunk["rank"] = i + 1
                candidates[i] = chunk
            return candidates[:top_k]

        # Cap candidates sent to the cross-encoder to avoid OOM on 512 MB instances.
        # RRF already orders by relevance, so the top-N are the most promising.
        max_to_score = min(len(candidates), top_k * 2)
        candidates = candidates[:max_to_score]

        passages = [c["text"] for c in candidates]
        scores = list(self._model.rerank(query, passages))

        scored = sorted(
            zip(candidates, scores),
            key=lambda x: float(x[1]),
            reverse=True,
        )

        results = []
        for i, (chunk, score) in enumerate(scored[:top_k]):
            entry = dict(chunk)
            entry["rerank_score"] = round(float(score), 4)
            entry["rank"] = i + 1
            results.append(entry)

        return results


reranker = Reranker()
