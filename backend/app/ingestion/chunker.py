import re
from dataclasses import dataclass, field
from typing import Optional
from app.ingestion.parsers.base import ParsedDocument, ParsedPage
from app.core.config import settings


@dataclass
class Chunk:
    chunk_index: int
    text: str
    page_number: Optional[int]
    section_heading: Optional[str]
    char_start: int
    char_end: int
    token_count: int = 0


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _split_into_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _split_text_with_overlap(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
    min_chunk_size: int,
) -> list[tuple[str, int, int]]:
    """
    Returns list of (chunk_text, char_start, char_end).
    Tries paragraph → sentence → character boundaries in that order.
    """
    if len(text) <= chunk_size:
        return [(text, 0, len(text))]

    paragraphs = re.split(r"\n\n+", text)
    chunks: list[tuple[str, int, int]] = []
    current = ""
    current_start = 0
    offset = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            offset += 2
            continue

        if len(current) + len(para) + 1 <= chunk_size:
            if current:
                current += "\n\n" + para
            else:
                current_start = offset
                current = para
        else:
            if current:
                chunks.append((current, current_start, current_start + len(current)))
                overlap_text = current[-chunk_overlap:] if len(current) > chunk_overlap else current
                current = overlap_text + "\n\n" + para
                current_start = current_start + len(current) - len(overlap_text) - 2 - len(para)
            else:
                # Single paragraph exceeds chunk_size — split by sentence
                sentences = _split_into_sentences(para)
                sent_buf = ""
                sent_start = offset
                for sent in sentences:
                    if len(sent_buf) + len(sent) + 1 <= chunk_size:
                        sent_buf = sent_buf + " " + sent if sent_buf else sent
                    else:
                        if sent_buf and len(sent_buf) >= min_chunk_size:
                            chunks.append((sent_buf, sent_start, sent_start + len(sent_buf)))
                        overlap_text = sent_buf[-chunk_overlap:] if len(sent_buf) > chunk_overlap else sent_buf
                        sent_buf = overlap_text + " " + sent if overlap_text else sent
                        sent_start = sent_start + len(sent_buf) - len(overlap_text) - 1 - len(sent)
                if sent_buf and len(sent_buf) >= min_chunk_size:
                    chunks.append((sent_buf, sent_start, sent_start + len(sent_buf)))
                current = ""
                current_start = 0

        offset += len(para) + 2

    if current and len(current) >= min_chunk_size:
        chunks.append((current, current_start, current_start + len(current)))
    elif current and chunks:
        # Append small tail to last chunk
        prev_text, prev_start, prev_end = chunks[-1]
        merged = prev_text + "\n\n" + current
        chunks[-1] = (merged, prev_start, prev_end + 2 + len(current))

    return chunks


def chunk_document(
    doc: ParsedDocument,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> list[Chunk]:
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    min_chunk = settings.min_chunk_size

    chunks: list[Chunk] = []
    chunk_index = 0
    current_heading: Optional[str] = None

    for page in doc.pages:
        # Track heading from page metadata
        if page.headings:
            current_heading = page.headings[0]

        # Extract heading from text markers embedded by parsers
        for match in re.finditer(r"^## (.+)$", page.text, re.MULTILINE):
            current_heading = match.group(1).strip()

        text_parts = _split_text_with_overlap(page.text, chunk_size, chunk_overlap, min_chunk)

        for chunk_text, cs, ce in text_parts:
            # Update current_heading if this chunk contains a heading marker
            heading_match = re.search(r"^## (.+)$", chunk_text, re.MULTILINE)
            if heading_match:
                current_heading = heading_match.group(1).strip()
                chunk_text = re.sub(r"^## .+$\n?", "", chunk_text, flags=re.MULTILINE).strip()

            # Always keep a chunk if it would be the only one for this page
            if len(chunk_text) < min_chunk and (chunks or chunk_index > 0):
                continue

            chunks.append(Chunk(
                chunk_index=chunk_index,
                text=chunk_text,
                page_number=page.page_number,
                section_heading=current_heading,
                char_start=cs,
                char_end=ce,
                token_count=_estimate_tokens(chunk_text),
            ))
            chunk_index += 1

    return chunks
