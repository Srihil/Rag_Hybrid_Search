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
