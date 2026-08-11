import pytest
from app.retrieval.fusion import reciprocal_rank_fusion


def _make_chunk(chunk_id: str, score: float = 1.0) -> dict:
    return {
        "chunk_id": chunk_id,
        "text": f"Text for {chunk_id}",
        "document_id": "doc1",
        "document_name": "test.pdf",
        "page_number": 1,
        "section_heading": None,
        "score": score,
        "rank": 1,
    }


def test_rrf_merges_two_lists():
    dense = [_make_chunk("A"), _make_chunk("B"), _make_chunk("C")]
    bm25 = [_make_chunk("C"), _make_chunk("D"), _make_chunk("A")]
    result = reciprocal_rank_fusion([dense, bm25])
    ids = [r["chunk_id"] for r in result]
    # A and C appear in both lists, so they should rank higher than B and D
    assert ids.index("A") < ids.index("D")
    assert ids.index("C") < ids.index("B")


def test_rrf_single_list_preserves_order():
    chunks = [_make_chunk("X"), _make_chunk("Y"), _make_chunk("Z")]
    result = reciprocal_rank_fusion([chunks])
    ids = [r["chunk_id"] for r in result]
    assert ids == ["X", "Y", "Z"]


def test_rrf_all_unique_items():
    list1 = [_make_chunk("A"), _make_chunk("B")]
    list2 = [_make_chunk("C"), _make_chunk("D")]
    result = reciprocal_rank_fusion([list1, list2])
    assert len(result) == 4


def test_rrf_scores_are_positive():
    dense = [_make_chunk("A"), _make_chunk("B")]
    result = reciprocal_rank_fusion([dense])
    for r in result:
        assert r["rrf_score"] > 0


def test_rrf_empty_lists():
    result = reciprocal_rank_fusion([[], []])
    assert result == []


def test_rrf_assigns_sequential_ranks():
    dense = [_make_chunk("A"), _make_chunk("B"), _make_chunk("C")]
    result = reciprocal_rank_fusion([dense])
    ranks = [r["rank"] for r in result]
    assert ranks == [1, 2, 3]
