from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Reranker:
    def __init__(self):
        self._model = None

    def is_loaded(self) -> bool:
        return self._model is not None

    def _load(self):
        if self._model is None:
            logger.info("loading_reranker_model", model=settings.reranker_model)
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(settings.reranker_model)
            logger.info("reranker_model_loaded", model=settings.reranker_model)

    def rerank(self, query: str, candidates: list[dict], top_k: int = None) -> list[dict]:
        """
        Scores each (query, chunk_text) pair using a cross-encoder.
        The cross-encoder attends jointly to both query and passage,
        producing a more accurate relevance score than independent embeddings.
        Returns candidates sorted by cross-encoder score, limited to top_k.
        """
        if not candidates:
            return []

        top_k = top_k or settings.rerank_top_k
        self._load()

        pairs = [(query, c["text"]) for c in candidates]
        scores = self._model.predict(pairs)

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
