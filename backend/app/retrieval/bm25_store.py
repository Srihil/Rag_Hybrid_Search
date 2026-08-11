import os
import re
import pickle
from typing import Optional
from rank_bm25 import BM25Okapi
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _tokenize(text: str) -> list[str]:
    text = text.lower()
    tokens = re.findall(r"\b[a-z0-9]+\b", text)
    return tokens


class BM25Store:
    """
    In-memory BM25 index over document chunks.
    Persists the corpus list to disk so it can survive restarts.
    The index itself is rebuilt from the corpus on load (fast).
    """

    def __init__(self):
        self._corpus: list[dict] = []  # list of {chunk_id, document_id, text, page_number, section_heading, document_name}
        self._index: Optional[BM25Okapi] = None
        self._tokenized: list[list[str]] = []

    def _rebuild_index(self):
        if not self._corpus:
            self._index = None
            self._tokenized = []
            return
        self._tokenized = [_tokenize(item["text"]) for item in self._corpus]
        self._index = BM25Okapi(self._tokenized)
        logger.info("bm25_index_rebuilt", doc_count=len(self._corpus))

    def _save(self):
        os.makedirs(os.path.dirname(settings.bm25_index_path), exist_ok=True)
        with open(settings.bm25_index_path, "wb") as f:
            pickle.dump(self._corpus, f)

    def load_from_disk(self):
        if os.path.exists(settings.bm25_index_path):
            try:
                with open(settings.bm25_index_path, "rb") as f:
                    self._corpus = pickle.load(f)
                self._rebuild_index()
                logger.info("bm25_loaded_from_disk", count=len(self._corpus))
            except Exception as e:
                logger.warning("bm25_load_failed", error=str(e))
                self._corpus = []
                self._index = None

    def rebuild_from_db(self, db_session) -> None:
        """
        Rebuilds corpus entirely from PostgreSQL DocumentChunk records.
        Called at startup and after document deletions.
        """
        from app.db.models import DocumentChunk, Document
        from sqlalchemy.orm import joinedload

        chunks = (
            db_session.query(DocumentChunk)
            .join(Document)
            .all()
        )
        self._corpus = [
            {
                "chunk_id": str(c.id),
                "document_id": str(c.document_id),
                "document_name": c.document.original_filename,
                "text": c.text,
                "page_number": c.page_number,
                "section_heading": c.section_heading,
            }
            for c in chunks
        ]
        self._rebuild_index()
        self._save()
        logger.info("bm25_rebuilt_from_db", count=len(self._corpus))

    def add_chunks(self, chunks: list[dict]) -> None:
        """Add new chunks without full rebuild."""
        self._corpus.extend(chunks)
        self._rebuild_index()
        self._save()

    def remove_document(self, document_id: str) -> None:
        self._corpus = [c for c in self._corpus if c["document_id"] != document_id]
        self._rebuild_index()
        self._save()

    def search(self, query: str, top_k: int, document_id: Optional[str] = None) -> list[dict]:
        if self._index is None or not self._corpus:
            return []

        corpus = self._corpus
        tokenized = self._tokenized
        index = self._index

        if document_id:
            filtered_indices = [i for i, c in enumerate(corpus) if c["document_id"] == document_id]
            if not filtered_indices:
                return []
            filtered_corpus = [corpus[i] for i in filtered_indices]
            filtered_tokenized = [tokenized[i] for i in filtered_indices]
            index = BM25Okapi(filtered_tokenized)
        else:
            filtered_corpus = corpus
            filtered_indices = list(range(len(corpus)))

        query_tokens = _tokenize(query)
        scores = index.get_scores(query_tokens)

        ranked = sorted(
            [(filtered_corpus[i], float(scores[i])) for i in range(len(filtered_corpus))],
            key=lambda x: x[1],
            reverse=True,
        )

        results = []
        for chunk, score in ranked[:top_k]:
            if score > 0:
                results.append({**chunk, "score": score})

        return results

    @property
    def corpus_size(self) -> int:
        return len(self._corpus)


bm25_store = BM25Store()
