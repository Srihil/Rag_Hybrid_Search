import numpy as np
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Embedder:
    def __init__(self):
        self._model = None

    def is_loaded(self) -> bool:
        return self._model is not None

    def _load(self):
        if self._model is None:
            logger.info("loading_embedding_model", model=settings.embedding_model)
            from fastembed import TextEmbedding
            self._model = TextEmbedding(settings.embedding_model)
            logger.info("embedding_model_loaded", model=settings.embedding_model)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        self._load()
        return [e.tolist() for e in self._model.embed(texts)]

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]


embedder = Embedder()
