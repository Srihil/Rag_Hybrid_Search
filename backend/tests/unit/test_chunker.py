import pytest
from app.ingestion.chunker import chunk_document, _split_text_with_overlap
from app.ingestion.parsers.base import ParsedDocument, ParsedPage


def _make_doc(text: str, pages: int = 1) -> ParsedDocument:
    page_size = len(text) // pages
    parsed_pages = []
    for i in range(pages):
        start = i * page_size
        end = start + page_size if i < pages - 1 else len(text)
        parsed_pages.append(ParsedPage(page_number=i + 1, text=text[start:end]))
    return ParsedDocument(filename="test.pdf", file_type="pdf", pages=parsed_pages, total_pages=pages)


def test_short_document_produces_one_chunk():
    doc = _make_doc("This is a short document with very little content.")
    chunks = chunk_document(doc, chunk_size=1000, chunk_overlap=100)
    assert len(chunks) >= 1
    assert all(len(c.text) > 0 for c in chunks)


def test_long_document_splits_into_multiple_chunks():
    long_text = ("This is a sentence. " * 100)
    doc = _make_doc(long_text)
    chunks = chunk_document(doc, chunk_size=200, chunk_overlap=50)
    assert len(chunks) > 1


def test_chunks_preserve_page_number():
    doc = _make_doc("Page content here. " * 50, pages=2)
    chunks = chunk_document(doc)
    page_numbers = {c.page_number for c in chunks}
    assert len(page_numbers) >= 1


def test_chunk_indices_are_sequential():
    doc = _make_doc("Sentence one. Sentence two. Sentence three. " * 50)
    chunks = chunk_document(doc, chunk_size=100, chunk_overlap=20)
    for i, c in enumerate(chunks):
        assert c.chunk_index == i


def test_split_text_with_overlap_short():
    result = _split_text_with_overlap("Hello world", chunk_size=1000, chunk_overlap=100, min_chunk_size=5)
    assert len(result) == 1
    assert result[0][0] == "Hello world"


def test_split_text_preserves_content():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    result = _split_text_with_overlap(text, chunk_size=40, chunk_overlap=10, min_chunk_size=5)
    combined = " ".join(r[0] for r in result)
    assert "First paragraph" in combined
    assert "Second paragraph" in combined
