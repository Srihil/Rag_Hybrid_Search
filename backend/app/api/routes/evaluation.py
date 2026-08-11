from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.api.deps import get_db
from app.db.models import EvaluationResult, EvaluationItem
from app.evaluation.runner import run_evaluation
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class EvalResultOut(BaseModel):
    strategy: str
    recall_at_5: float
    hit_rate: float
    mrr: float
    question_count: int
    run_at: str


class EvalDatasetItem(BaseModel):
    id: str = ""
    question: str
    expected_chunk_ids: list[str]
    notes: str = ""


@router.post("/run", response_model=list[EvalResultOut])
def trigger_evaluation(db: Session = Depends(get_db)):
    items = db.query(EvaluationItem).count()
    if items == 0:
        raise HTTPException(
            400,
            "No evaluation questions found. Add evaluation data via POST /evaluation/dataset or import a JSON file."
        )
    results = run_evaluation(db)
    return [
        EvalResultOut(
            strategy=r["strategy"],
            recall_at_5=r["recall_at_5"],
            hit_rate=r["hit_rate"],
            mrr=r["mrr"],
            question_count=r["question_count"],
            run_at="now",
        )
        for r in results
    ]


@router.get("/results", response_model=list[EvalResultOut])
def get_evaluation_results(db: Session = Depends(get_db)):
    # Get the most recent run for each strategy
    from sqlalchemy import func
    subq = (
        db.query(
            EvaluationResult.strategy,
            func.max(EvaluationResult.run_at).label("max_run"),
        )
        .group_by(EvaluationResult.strategy)
        .subquery()
    )
    results = (
        db.query(EvaluationResult)
        .join(subq, (EvaluationResult.strategy == subq.c.strategy) & (EvaluationResult.run_at == subq.c.max_run))
        .all()
    )
    return [
        EvalResultOut(
            strategy=r.strategy,
            recall_at_5=r.metrics.get("recall_at_5", 0),
            hit_rate=r.metrics.get("hit_rate", 0),
            mrr=r.metrics.get("mrr", 0),
            question_count=r.metrics.get("question_count", 0),
            run_at=r.run_at.isoformat(),
        )
        for r in results
    ]


@router.get("/dataset", response_model=list[EvalDatasetItem])
def get_eval_dataset(db: Session = Depends(get_db)):
    items = db.query(EvaluationItem).all()
    return [
        EvalDatasetItem(
            id=str(i.id),
            question=i.question,
            expected_chunk_ids=i.expected_chunk_ids or [],
            notes=i.notes or "",
        )
        for i in items
    ]


@router.post("/dataset", response_model=EvalDatasetItem, status_code=201)
def add_eval_question(item: EvalDatasetItem, db: Session = Depends(get_db)):
    from app.db.models import EvaluationItem as EvalModel
    row = EvalModel(
        question=item.question,
        expected_chunk_ids=item.expected_chunk_ids,
        notes=item.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return EvalDatasetItem(
        id=str(row.id),
        question=row.question,
        expected_chunk_ids=row.expected_chunk_ids,
        notes=row.notes or "",
    )


class BulkImportResult(BaseModel):
    imported: int


@router.post("/dataset/bulk", response_model=BulkImportResult, status_code=201)
def bulk_import_eval_dataset(items: List[EvalDatasetItem], db: Session = Depends(get_db)):
    """Import a JSON array of evaluation questions in one request."""
    from app.db.models import EvaluationItem as EvalModel
    rows = [
        EvalModel(
            question=item.question,
            expected_chunk_ids=item.expected_chunk_ids,
            notes=item.notes,
        )
        for item in items
    ]
    db.bulk_save_objects(rows)
    db.commit()
    logger.info("eval_dataset_bulk_imported", count=len(rows))
    return BulkImportResult(imported=len(rows))
