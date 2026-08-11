from __future__ import annotations
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://raguser:ragpassword@localhost:5432/ragdb"

    # Qdrant — set QDRANT_MODE=local for file-based dev (no Docker), remote for Docker/server/cloud
    qdrant_mode: str = "local"
    qdrant_local_path: str = "./qdrant_data"
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: Optional[str] = None   # required for Qdrant Cloud
    qdrant_collection: str = "chunks"

    # LLM
    llm_provider: str = "ollama"  # "ollama" or "openrouter"
    llm_model: str = "llama3.2:3b"
    ollama_base_url: str = "http://localhost:11434"
    openrouter_api_key: Optional[str] = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Models
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Storage
    upload_dir: str = "./uploads"
    bm25_index_path: str = "./bm25_index/corpus.pkl"

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200
    min_chunk_size: int = 100

    # Retrieval
    retrieval_top_k: int = 20
    rerank_top_k: int = 5
    rrf_k: int = 60

    # App
    log_level: str = "INFO"
    max_upload_size_mb: int = 50
    allowed_extensions: List[str] = ["pdf", "docx", "txt"]
    enable_reranker: bool = True  # set ENABLE_RERANKER=false on memory-constrained hosts

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("upload_dir", "bm25_index_path", mode="before")
    @classmethod
    def ensure_dirs(cls, v: str) -> str:
        path = os.path.dirname(v) if "." in os.path.basename(v) else v
        if path:
            os.makedirs(path, exist_ok=True)
        return v


settings = Settings()
