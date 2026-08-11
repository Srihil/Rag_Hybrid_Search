import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_db
from app.db.models import Document, DocumentChunk
from app.ingestion.pipeline import process_document, save_upload_file, delete_document_files
from app.retrieval.vector_store import vector_store
from app.retrieval.bm25_store import bm25_store
from app.core.config import settings
from app.core.logging import get_logger
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter()


class DocumentResponse(BaseModel):
    id: str
    original_filename: str
    file_type: str
    file_size: Optional[int]
    status: str
    chunk_count: int
    page_count: Optional[int]
    error_message: Optional[str]
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ChunkResponse(BaseModel):
    id: str
    chunk_index: int
    text: str
    page_number: Optional[int]
    section_heading: Optional[str]
    token_count: Optional[int]


def _doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        chunk_count=doc.chunk_count,
        page_count=doc.page_count,
        error_message=doc.error_message,
        created_at=doc.created_at.isoformat(),
        updated_at=doc.updated_at.isoformat(),
    )


@router.post("/upload", response_model=DocumentResponse, status_code=202)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate extension
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, f"File type .{ext} not supported. Allowed: {settings.allowed_extensions}")

    # Read content and validate size
    content = file.file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(413, f"File too large ({size_mb:.1f} MB). Max: {settings.max_upload_size_mb} MB")

    if len(content) == 0:
        raise HTTPException(400, "Uploaded file is empty")

    # Save file
    stored_name, file_path = save_upload_file(content, file.filename)

    # Create document record
    doc_id = str(uuid.uuid4())
    doc = Document(
        id=doc_id,
        filename=stored_name,
        original_filename=file.filename,
        file_type=ext,
        file_size=len(content),
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info("document_uploaded", document_id=doc_id, filename=file.filename)

    # Queue background processing
    background_tasks.add_task(_process_in_background, doc_id, file_path)

    return _doc_to_response(doc)


def _process_in_background(document_id: str, file_path: str):
    """Creates a fresh DB session for the background task."""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        process_document(document_id, file_path, db)
    finally:
        db.close()


@router.get("/", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [_doc_to_response(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return _doc_to_response(doc)


@router.get("/{document_id}/status")
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return {
        "id": str(doc.id),
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
    }


@router.get("/{document_id}/chunks", response_model=list[ChunkResponse])
def get_document_chunks(document_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )
    return [
        ChunkResponse(
            id=str(c.id),
            chunk_index=c.chunk_index,
            text=c.text,
            page_number=c.page_number,
            section_heading=c.section_heading,
            token_count=c.token_count,
        )
        for c in chunks
    ]


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete from Qdrant first (safe to retry)
    try:
        vector_store.delete_by_document(document_id)
    except Exception as e:
        logger.warning("qdrant_delete_failed", document_id=document_id, error=str(e))

    # Remove from BM25 index
    bm25_store.remove_document(document_id)

    # Remove physical file
    delete_document_files(doc.filename)

    # Delete from PostgreSQL (cascades to chunks)
    db.delete(doc)
    db.commit()
    logger.info("document_deleted", document_id=document_id)
