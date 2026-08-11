from datetime import datetime
from sqlalchemy.orm import Session
from app.evaluation.dataset import load_from_db, EvalQuestion
from app.evaluation.metrics import recall_at_k, hit_rate_at_k, mean_reciprocal_rank, average_metrics
from app.retrieval.dense import dense_search
from app.retrieval.bm25 import bm25_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.reranker import reranker
from app.db.models import EvaluationResult
from app.core.logging import get_logger

logger = get_logger(__name__)

K = 5  # Evaluate at K=5


def _get_ids(results: list[dict]) -> list[str]:
    return [r["chunk_id"] for r in results]


def _run_strategy(strategy: str, question: EvalQuestion) -> dict:
    q = question.question
    relevant = question.expected_chunk_ids

    if strategy == "bm25":
        results = bm25_search(q, top_k=K)
        retrieved = _get_ids(results)

    elif strategy == "dense":
        results = dense_search(q, top_k=K)
        retrieved = _get_ids(results)

    elif strategy == "hybrid":
        dense = dense_search(q, top_k=20)
        bm = bm25_search(q, top_k=20)
        fused = reciprocal_rank_fusion([dense, bm])
        retrieved = _get_ids(fused[:K])

    elif strategy == "hybrid_reranked":
        dense = dense_search(q, top_k=20)
        bm = bm25_search(q, top_k=20)
        fused = reciprocal_rank_fusion([dense, bm])
        reranked = reranker.rerank(q, fused[:20], top_k=K)
        retrieved = _get_ids(reranked)

    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    return {
        "recall_at_k": recall_at_k(retrieved, relevant, K),
        "hit_rate": hit_rate_at_k(retrieved, relevant, K),
        "mrr": mean_reciprocal_rank(retrieved, relevant),
    }


def run_evaluation(db: Session) -> list[dict]:
    """
    Runs all retrieval strategies against the evaluation dataset.
    Stores results in PostgreSQL and returns a summary.
    """
    questions = load_from_db(db)
    if not questions:
        logger.warning("evaluation_no_questions")
        return []

    strategies = ["bm25", "dense", "hybrid", "hybrid_reranked"]
    all_results = []

    for strategy in strategies:
        per_question_metrics = []
        for q in questions:
            try:
                m = _run_strategy(strategy, q)
                per_question_metrics.append(m)
            except Exception as e:
                logger.error("eval_question_failed", strategy=strategy, question=q.question[:60], error=str(e))

        if not per_question_metrics:
            continue

        aggregated = {
            "recall_at_5": round(average_metrics([m["recall_at_k"] for m in per_question_metrics]), 4),
            "hit_rate": round(average_metrics([m["hit_rate"] for m in per_question_metrics]), 4),
            "mrr": round(average_metrics([m["mrr"] for m in per_question_metrics]), 4),
            "question_count": len(per_question_metrics),
            "k": K,
        }

        result_row = EvaluationResult(
            strategy=strategy,
            metrics=aggregated,
            run_at=datetime.utcnow(),
        )
        db.add(result_row)
        all_results.append({"strategy": strategy, **aggregated})

    db.commit()
    logger.info("evaluation_complete", strategies=strategies, questions=len(questions))
    return all_results
