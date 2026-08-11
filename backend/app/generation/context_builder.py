def build_context(evidence: list[dict]) -> str:
    """
    Formats the retrieved evidence into a numbered source list for the LLM prompt.
    Each source is clearly labelled so the model can produce verifiable citations.
    """
    parts = []
    for i, chunk in enumerate(evidence, start=1):
        doc_name = chunk.get("document_name", "Unknown Document")
        page = chunk.get("page_number")
        section = chunk.get("section_heading")
        text = chunk.get("text", "")

        header_parts = [f"Document: {doc_name}"]
        if page:
            header_parts.append(f"Page: {page}")
        if section:
            header_parts.append(f"Section: {section}")

        header = " | ".join(header_parts)
        parts.append(f"[{i}] {header}\n{text.strip()}")

    return "\n\n---\n\n".join(parts)


def build_citation_list(evidence: list[dict]) -> list[dict]:
    """Returns a structured citation list mirroring the source numbering."""
    citations = []
    for i, chunk in enumerate(evidence, start=1):
        citations.append({
            "source_num": i,
            "chunk_id": chunk.get("chunk_id"),
            "document_name": chunk.get("document_name"),
            "page_number": chunk.get("page_number"),
            "section_heading": chunk.get("section_heading"),
            "text_preview": (chunk.get("text", "")[:300] + "...")
            if len(chunk.get("text", "")) > 300
            else chunk.get("text", ""),
        })
    return citations
