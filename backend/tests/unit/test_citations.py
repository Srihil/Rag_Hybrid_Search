import pytest
from app.generation.citations import (
    extract_citation_numbers,
    verify_citations,
    is_insufficient_evidence_response,
    build_verified_citations,
)


EVIDENCE = [
    {"chunk_id": "c1", "document_name": "Doc A", "page_number": 1, "section_heading": "Intro", "text": "Content A"},
    {"chunk_id": "c2", "document_name": "Doc B", "page_number": 2, "section_heading": "Policy", "text": "Content B"},
    {"chunk_id": "c3", "document_name": "Doc C", "page_number": 3, "section_heading": "Rules", "text": "Content C"},
]


def test_extract_citation_numbers_basic():
    text = "The policy states X [1]. Further, Y is true [2][3]."
    result = extract_citation_numbers(text)
    assert result == [1, 2, 3]


def test_extract_citation_numbers_deduplicates():
    text = "See [1] and [1] again [2]."
    result = extract_citation_numbers(text)
    assert result == [1, 2]


def test_extract_citation_numbers_empty():
    assert extract_citation_numbers("No citations here.") == []


def test_verify_citations_all_valid():
    text = "Answer with [1] and [2]."
    result = verify_citations(text, EVIDENCE)
    assert result.verified == [1, 2]
    assert result.invalid == []
    assert result.all_valid is True


def test_verify_citations_detects_invalid():
    text = "Answer [1] and [99]."
    result = verify_citations(text, EVIDENCE)
    assert 1 in result.verified
    assert 99 in result.invalid
    assert result.all_valid is False


def test_verify_citations_no_evidence():
    result = verify_citations("Answer [1].", [])
    assert 1 in result.invalid


def test_insufficient_evidence_detection():
    assert is_insufficient_evidence_response(
        "I couldn't find sufficient information in the provided documents to answer this question reliably."
    )
    assert not is_insufficient_evidence_response("The answer is 42 [1].")


def test_build_verified_citations_excludes_uncited():
    citation_list = [
        {"source_num": 1, "chunk_id": "c1", "document_name": "Doc A", "page_number": 1,
         "section_heading": "Intro", "text_preview": "Content A"},
        {"source_num": 2, "chunk_id": "c2", "document_name": "Doc B", "page_number": 2,
         "section_heading": "Policy", "text_preview": "Content B"},
    ]
    answer = "The answer is found in [1] only."
    result = build_verified_citations(answer, EVIDENCE, citation_list)
    assert len(result) == 1
    assert result[0]["source_num"] == 1
    assert result[0]["verified"] is True
