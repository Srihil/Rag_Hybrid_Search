import json
import os
from dataclasses import dataclass
from sqlalchemy.orm import Session
from app.db.models import EvaluationItem


@dataclass
class EvalQuestion:
    id: str
    question: str
    expected_chunk_ids: list[str]
    notes: str = ""


def load_from_db(db: Session) -> list[EvalQuestion]:
    items = db.query(EvaluationItem).all()
    return [
        EvalQuestion(
            id=str(item.id),
            question=item.question,
            expected_chunk_ids=item.expected_chunk_ids or [],
            notes=item.notes or "",
        )
        for item in items
    ]


def import_json_file(path: str, db: Session) -> int:
    """Import evaluation Q&A pairs from a JSON file into the database."""
    if not os.path.exists(path):
        return 0
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    added = 0
    for item in data.get("questions", []):
        existing = db.query(EvaluationItem).filter(
            EvaluationItem.question == item["question"]
        ).first()
        if existing:
            continue
        db.add(EvaluationItem(
            question=item["question"],
            expected_chunk_ids=item.get("expected_chunk_ids", []),
            notes=item.get("notes", ""),
        ))
        added += 1
    db.commit()
    return added
