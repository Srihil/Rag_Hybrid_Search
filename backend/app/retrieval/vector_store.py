import os
import threading
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    PayloadSchemaType,
)
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class VectorStore:
    def __init__(self):
        self._client: Optional[QdrantClient] = None
        # Local file mode only allows one concurrent writer — serialise all writes
        self._lock = threading.Lock()

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            if settings.qdrant_mode == "local":
                os.makedirs(settings.qdrant_local_path, exist_ok=True)
                self._client = QdrantClient(path=settings.qdrant_local_path)
            else:
                # Qdrant Cloud: api_key is set → use HTTPS on port 6333
                # Local Docker: no api_key → plain HTTP
                self._client = QdrantClient(
                    host=settings.qdrant_host,
                    port=settings.qdrant_port,
                    api_key=settings.qdrant_api_key if settings.qdrant_api_key else None,
                    https=bool(settings.qdrant_api_key),
                    timeout=30,
                )
        return self._client

    def ensure_collection(self):
        with self._lock:
            client = self._get_client()
            existing = [c.name for c in client.get_collections().collections]
            if settings.qdrant_collection not in existing:
                client.create_collection(
                    collection_name=settings.qdrant_collection,
                    vectors_config=VectorParams(
                        size=settings.embedding_dim,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info("qdrant_collection_created", name=settings.qdrant_collection)

            # Ensure payload index exists for document_id so filtered searches work.
            # Qdrant Cloud requires an explicit index; create_payload_index is idempotent.
            try:
                client.create_payload_index(
                    collection_name=settings.qdrant_collection,
                    field_name="document_id",
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                logger.info("qdrant_payload_index_ready", field="document_id")
            except Exception as e:
                logger.warning("qdrant_payload_index_failed", field="document_id", error=str(e))

    def upsert_chunks(self, chunk_records: list[dict]) -> None:
        points = [
            PointStruct(
                id=r["chunk_id"],
                vector=r["vector"],
                payload={
                    "document_id": r["document_id"],
                    "document_name": r["document_name"],
                    "chunk_index": r["chunk_index"],
                    "text": r["text"],
                    "page_number": r.get("page_number"),
                    "section_heading": r.get("section_heading"),
                },
            )
            for r in chunk_records
        ]
        with self._lock:
            client = self._get_client()
            client.upsert(collection_name=settings.qdrant_collection, points=points, wait=True)
        logger.info("qdrant_upserted", count=len(points))

    def search(
        self,
        query_vector: list[float],
        top_k: int,
        document_id: Optional[str] = None,
    ) -> list[dict]:
        query_filter = None
        if document_id:
            query_filter = Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            )
        with self._lock:
            client = self._get_client()
            results = client.search(
                collection_name=settings.qdrant_collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
            )
        return [
            {
                "chunk_id": str(r.id),
                "score": float(r.score),
                **r.payload,
            }
            for r in results
        ]

    def delete_by_document(self, document_id: str) -> None:
        with self._lock:
            client = self._get_client()
            client.delete(
                collection_name=settings.qdrant_collection,
                points_selector=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
                ),
                wait=True,
            )
        logger.info("qdrant_deleted", document_id=document_id)

    def collection_info(self) -> dict:
        with self._lock:
            client = self._get_client()
            info = client.get_collection(settings.qdrant_collection)
        return {
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
        }


vector_store = VectorStore()
