import pytest
from app.retrieval.bm25_store import BM25Store, _tokenize


def _make_store(texts: list[str]) -> BM25Store:
    store = BM25Store()
    chunks = [
        {
            "chunk_id": f"c{i}",
            "document_id": "doc1",
            "document_name": "test.pdf",
            "text": text,
            "page_number": i + 1,
            "section_heading": None,
        }
        for i, text in enumerate(texts)
    ]
    store.add_chunks(chunks)
    return store


def test_tokenizer_lowercases():
    tokens = _tokenize("Hello World FOO")
    assert tokens == ["hello", "world", "foo"]


def test_tokenizer_removes_punctuation():
    tokens = _tokenize("hello, world!")
    assert "hello" in tokens
    assert "world" in tokens


def test_bm25_returns_relevant_result():
    store = _make_store([
        "The parental leave policy grants 12 weeks of paid leave",
        "Employees must submit expense reports monthly",
        "Health insurance covers dental and vision",
    ])
    results = store.search("parental leave policy", top_k=3)
    assert results[0]["chunk_id"] == "c0"


def test_bm25_empty_store_returns_empty():
    store = BM25Store()
    results = store.search("any query", top_k=5)
    assert results == []


def test_bm25_returns_no_more_than_top_k():
    store = _make_store([f"document number {i}" for i in range(20)])
    results = store.search("document", top_k=5)
    assert len(results) <= 5


def test_bm25_filters_by_document_id():
    store = BM25Store()
    store.add_chunks([
        {"chunk_id": "c1", "document_id": "docA", "document_name": "A.pdf",
         "text": "parental leave policy weeks", "page_number": 1, "section_heading": None},
        {"chunk_id": "c2", "document_id": "docB", "document_name": "B.pdf",
         "text": "parental leave policy months", "page_number": 1, "section_heading": None},
    ])
    results = store.search("parental leave", top_k=5, document_id="docA")
    assert all(r["document_id"] == "docA" for r in results)


def test_bm25_remove_document():
    store = _make_store(["parental leave policy", "vacation days"])
    store._corpus[0]["document_id"] = "docA"
    store._corpus[1]["document_id"] = "docB"
    store._rebuild_index()
    store.remove_document("docA")
    results = store.search("parental leave", top_k=5)
    assert all(r["document_id"] != "docA" for r in results)
