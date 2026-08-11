from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.api.deps import get_db
from app.core.config import settings
import httpx

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"


class ServiceStatus(BaseModel):
    name: str
    status: str
    detail: str = ""


class SystemStatusResponse(BaseModel):
    services: list[ServiceStatus]
    llm_provider: str
    llm_model: str
    embedding_model: str
    reranker_model: str


class StatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_queries: int
    processing: int


@router.get("/stats", response_model=StatsResponse)
def stats(db: Session = Depends(get_db)):
    from app.db.models import Document, DocumentChunk, QueryRecord
    from sqlalchemy import func
    total_docs = db.query(func.count(Document.id)).scalar() or 0
    total_chunks = db.query(func.count(DocumentChunk.id)).scalar() or 0
    total_queries = db.query(func.count(QueryRecord.id)).scalar() or 0
    processing = db.query(func.count(Document.id)).filter(
        Document.status.in_(["pending", "processing"])
    ).scalar() or 0
    return StatsResponse(
        total_documents=total_docs,
        total_chunks=total_chunks,
        total_queries=total_queries,
        processing=processing,
    )


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@router.get("/status", response_model=SystemStatusResponse)
def system_status(db: Session = Depends(get_db)):
    services = []

    # PostgreSQL
    try:
        db.execute(text("SELECT 1"))
        services.append(ServiceStatus(name="postgresql", status="ok"))
    except Exception as e:
        services.append(ServiceStatus(name="postgresql", status="error", detail=str(e)))

    # Qdrant
    if settings.qdrant_mode == "local":
        try:
            from app.retrieval.vector_store import vector_store
            # Reuse the already-open client — never create a second connection
            # to the local file store (only one connection allowed at a time)
            if vector_store._client is not None:
                cols = [c.name for c in vector_store._client.get_collections().collections]
                detail = f"local file mode · collections: {cols}"
                services.append(ServiceStatus(name="qdrant", status="ok", detail=detail))
            else:
                services.append(ServiceStatus(name="qdrant", status="starting", detail="not yet initialized"))
        except Exception as e:
            services.append(ServiceStatus(name="qdrant", status="error", detail=str(e)))
    else:
        try:
            resp = httpx.get(f"http://{settings.qdrant_host}:{settings.qdrant_port}/healthz", timeout=3)
            if resp.status_code == 200:
                services.append(ServiceStatus(name="qdrant", status="ok"))
            else:
                services.append(ServiceStatus(name="qdrant", status="error", detail=f"HTTP {resp.status_code}"))
        except Exception as e:
            services.append(ServiceStatus(name="qdrant", status="error", detail=str(e)))

    # Ollama (if selected)
    if settings.llm_provider == "ollama":
        try:
            resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3)
            if resp.status_code == 200:
                services.append(ServiceStatus(name="ollama", status="ok"))
            else:
                services.append(ServiceStatus(name="ollama", status="error", detail=f"HTTP {resp.status_code}"))
        except Exception as e:
            services.append(ServiceStatus(name="ollama", status="unreachable", detail=str(e)))

    # Embedding model warm status
    try:
        from app.embeddings.embedder import embedder
        if embedder.is_loaded():
            services.append(ServiceStatus(name="embedding_model", status="loaded"))
        else:
            services.append(ServiceStatus(name="embedding_model", status="not_loaded"))
    except Exception:
        services.append(ServiceStatus(name="embedding_model", status="not_loaded"))

    # Reranker warm status
    try:
        from app.retrieval.reranker import reranker
        if reranker.is_loaded():
            services.append(ServiceStatus(name="reranker_model", status="loaded"))
        else:
            services.append(ServiceStatus(name="reranker_model", status="not_loaded"))
    except Exception:
        services.append(ServiceStatus(name="reranker_model", status="not_loaded"))

    return SystemStatusResponse(
        services=services,
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
        embedding_model=settings.embedding_model,
        reranker_model=settings.reranker_model,
    )
