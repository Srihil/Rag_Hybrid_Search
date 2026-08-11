import os
import uuid
import shutil
from sqlalchemy.orm import Session
from app.db.models import Document, DocumentChunk
from app.ingestion.parsers.pdf_parser import parse_pdf
from app.ingestion.parsers.docx_parser import parse_docx
from app.ingestion.parsers.txt_parser import parse_txt
from app.ingestion.chunker import chunk_document
from app.embeddings.embedder import embedder
from app.retrieval.vector_store import vector_store
from app.retrieval.bm25_store import bm25_store
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_PARSERS = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "txt": parse_txt,
}


def process_document(document_id: str, file_path: str, db: Session) -> None:
    """
    Full ingestion pipeline for a single document.
    Runs in a background task — updates Document status in DB.
    """
    doc = db.get(Document, document_id)
    if not doc:
        logger.error("document_not_found", document_id=document_id)
        return

    doc.status = "processing"
    db.commit()

    try:
        file_type = doc.file_type.lower()
        parse_fn = _PARSERS.get(file_type)
        if not parse_fn:
            raise ValueError(f"No parser for file type: {file_type}")

        logger.info("parsing_document", document_id=document_id, file_type=file_type)
        parsed = parse_fn(file_path, doc.original_filename)

        logger.info("chunking_document", document_id=document_id, pages=parsed.total_pages)
        chunks = chunk_document(parsed)

        if not chunks:
            raise ValueError("Document produced no chunks — possibly empty or unreadable")

        logger.info("embedding_chunks", document_id=document_id, count=len(chunks))
        texts = [c.text for c in chunks]
        vectors = embedder.embed(texts)

        # Persist chunks to PostgreSQL
        db_chunks = []
        vector_records = []
        bm25_records = []

        for chunk, vector in zip(chunks, vectors):
            chunk_id = str(uuid.uuid4())
            db_chunk = DocumentChunk(
                id=chunk_id,
                document_id=document_id,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                page_number=chunk.page_number,
                section_heading=chunk.section_heading,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                token_count=chunk.token_count,
            )
            db_chunks.append(db_chunk)

            vector_records.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "document_name": doc.original_filename,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "page_number": chunk.page_number,
                "section_heading": chunk.section_heading,
                "vector": vector,
            })

            bm25_records.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "document_name": doc.original_filename,
                "text": chunk.text,
                "page_number": chunk.page_number,
                "section_heading": chunk.section_heading,
            })

        db.bulk_save_objects(db_chunks)

        # Store in Qdrant
        vector_store.ensure_collection()
        vector_store.upsert_chunks(vector_records)

        # Add to BM25 index
        bm25_store.add_chunks(bm25_records)

        doc.chunk_count = len(chunks)
        doc.page_count = parsed.total_pages
        doc.status = "completed"
        db.commit()
        logger.info("document_processed", document_id=document_id, chunks=len(chunks))

    except Exception as e:
        logger.error("document_processing_failed", document_id=document_id, error=str(e))
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        raise


def save_upload_file(file_content: bytes, original_filename: str) -> tuple[str, str]:
    """Save uploaded file to disk with a safe randomized name. Returns (stored_filename, file_path)."""
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "bin"
    safe_name = f"{uuid.uuid4()}.{ext}"
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(file_content)
    return safe_name, file_path


def delete_document_files(filename: str) -> None:
    file_path = os.path.join(settings.upload_dir, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
