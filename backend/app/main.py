from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.api.routes import documents, query, evaluation, system

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup_begin")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("database_tables_ready")

    # Ensure Qdrant collection exists
    try:
        from app.retrieval.vector_store import vector_store
        vector_store.ensure_collection()
    except Exception as e:
        logger.warning("qdrant_collection_setup_failed", error=str(e))

    # Rebuild BM25 index from DB
    try:
        from app.retrieval.bm25_store import bm25_store
        db = SessionLocal()
        bm25_store.rebuild_from_db(db)
        db.close()
    except Exception as e:
        logger.warning("bm25_rebuild_failed", error=str(e))

    # Reset documents left in processing/pending from a previous crash
    try:
        from app.db.models import Document
        db = SessionLocal()
        stuck = db.query(Document).filter(Document.status.in_(["pending", "processing"])).all()
        for doc in stuck:
            doc.status = "failed"
            doc.error_message = "Server restarted during processing — please re-upload"
        if stuck:
            db.commit()
            logger.info("reset_stuck_documents", count=len(stuck))
        db.close()
    except Exception as e:
        logger.warning("stuck_document_reset_failed", error=str(e))

    # Pre-warm both models at startup so the first query doesn't hit
    # a 10-second model-load delay that can push past Render's proxy timeout.
    # fastembed (ONNX) uses ~200 MB total — well within the 512 MB free-tier limit.
    try:
        from app.embeddings.embedder import embedder
        embedder._load()
        logger.info("embedding_model_ready")
    except Exception as e:
        logger.warning("embedding_model_warmup_failed", error=str(e))

    if settings.enable_reranker:
        try:
            from app.retrieval.reranker import reranker
            reranker._load()
            logger.info("reranker_model_ready")
        except Exception as e:
            logger.warning("reranker_model_warmup_failed", error=str(e))
    else:
        logger.info("reranker_disabled_by_config")

    logger.info("startup_complete")
    yield
    logger.info("shutdown")


app = FastAPI(
    title="RAG Hybrid Search API",
    description="Production RAG with Hybrid Search & Grounded Document Intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(query.router, prefix="/api/query", tags=["query"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["evaluation"])
