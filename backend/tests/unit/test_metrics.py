import pytest
from app.evaluation.metrics import recall_at_k, hit_rate_at_k, mean_reciprocal_rank, average_metrics


def test_recall_at_k_perfect():
    assert recall_at_k(["a", "b", "c"], ["a", "b"], k=5) == 1.0


def test_recall_at_k_partial():
    assert recall_at_k(["a", "x", "y"], ["a", "b"], k=3) == 0.5


def test_recall_at_k_none_found():
    assert recall_at_k(["x", "y"], ["a", "b"], k=5) == 0.0


def test_recall_at_k_empty_relevant():
    assert recall_at_k(["a", "b"], [], k=5) == 0.0


def test_hit_rate_at_k_hit():
    assert hit_rate_at_k(["a", "b", "c"], ["a"], k=3) == 1.0


def test_hit_rate_at_k_miss():
    assert hit_rate_at_k(["x", "y"], ["a"], k=2) == 0.0


def test_hit_rate_at_k_beyond_cutoff():
    assert hit_rate_at_k(["x", "y", "a"], ["a"], k=2) == 0.0


def test_mrr_first_hit():
    assert mean_reciprocal_rank(["a", "b", "c"], ["a"]) == 1.0


def test_mrr_second_hit():
    assert mean_reciprocal_rank(["x", "a", "b"], ["a"]) == pytest.approx(0.5)


def test_mrr_no_hit():
    assert mean_reciprocal_rank(["x", "y"], ["a"]) == 0.0


def test_average_metrics():
    assert average_metrics([0.5, 1.0, 0.0]) == pytest.approx(0.5)


def test_average_metrics_empty():
    assert average_metrics([]) == 0.0
