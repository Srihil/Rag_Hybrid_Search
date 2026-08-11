import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_db
from app.db.models import QueryRecord, Document
from app.retrieval.pipeline import run_retrieval_pipeline
from app.generation.generator import generate_answer
from app.core.logging import get_logger
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None


class CitationOut(BaseModel):
    source_num: int
    chunk_id: Optional[str]
    document_name: Optional[str]
    page_number: Optional[int]
    section_heading: Optional[str]
    text_preview: Optional[str]
    verified: bool


class QueryResponse(BaseModel):
    id: str
    query: str
    answer: str
    citations: list[CitationOut]
    has_sufficient_evidence: bool
    source_count: int
    status: str
    created_at: str


class QueryHistoryItem(BaseModel):
    id: str
    query: str
    status: str
    source_count: int
    has_sufficient_evidence: bool
    created_at: str


class QueryDetailResponse(QueryResponse):
    retrieval_trace: Optional[dict]


@router.post("/", response_model=QueryResponse)
def ask_question(request: QueryRequest, db: Session = Depends(get_db)):
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    # Validate document filter if provided
    if request.document_id:
        doc = db.get(Document, request.document_id)
        if not doc:
            raise HTTPException(404, f"Document {request.document_id} not found")
        if doc.status != "completed":
            raise HTTPException(400, f"Document is not ready (status: {doc.status})")

    query_id = str(uuid.uuid4())
    record = QueryRecord(
        id=query_id,
        query_text=request.query,
        status="processing",
        document_filter_id=request.document_id,
    )
    db.add(record)
    db.commit()

    try:
        logger.info("query_received", query_id=query_id, query=request.query[:80])

        # Run hybrid retrieval pipeline
        trace = run_retrieval_pipeline(
            query=request.query,
            document_id=request.document_id,
        )

        evidence = trace.final_context

        # Generate grounded answer
        result = generate_answer(request.query, evidence)

        # Persist query record
        record.answer_text = result.answer
        record.citations = [c for c in result.citations]
        record.retrieval_trace = trace.to_dict()
        record.status = "completed" if result.has_sufficient_evidence else "insufficient_evidence"
        record.source_count = len(result.citations)
        db.commit()

        logger.info("query_completed", query_id=query_id, citations=len(result.citations))

        return QueryResponse(
            id=query_id,
            query=request.query,
            answer=result.answer,
            citations=[CitationOut(**c) for c in result.citations],
            has_sufficient_evidence=result.has_sufficient_evidence,
            source_count=record.source_count,
            status=record.status,
            created_at=record.created_at.isoformat(),
        )

    except Exception as e:
        logger.error("query_failed", query_id=query_id, error=str(e))
        record.status = "failed"
        record.answer_text = f"Query processing failed: {str(e)}"
        db.commit()
        raise HTTPException(500, f"Query processing failed: {str(e)}")


@router.get("/history", response_model=list[QueryHistoryItem])
def get_query_history(limit: int = 50, db: Session = Depends(get_db)):
    records = (
        db.query(QueryRecord)
        .order_by(QueryRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        QueryHistoryItem(
            id=str(r.id),
            query=r.query_text,
            status=r.status,
            source_count=r.source_count,
            has_sufficient_evidence=r.status == "completed",
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


@router.get("/{query_id}", response_model=QueryDetailResponse)
def get_query(query_id: str, db: Session = Depends(get_db)):
    record = db.get(QueryRecord, query_id)
    if not record:
        raise HTTPException(404, "Query not found")
    return QueryDetailResponse(
        id=str(record.id),
        query=record.query_text,
        answer=record.answer_text or "",
        citations=[CitationOut(**c) for c in (record.citations or [])],
        has_sufficient_evidence=record.status == "completed",
        source_count=record.source_count,
        status=record.status,
        created_at=record.created_at.isoformat(),
        retrieval_trace=record.retrieval_trace,
    )
