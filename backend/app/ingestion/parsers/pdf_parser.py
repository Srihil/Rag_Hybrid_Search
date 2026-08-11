import re
import fitz  # PyMuPDF
from app.ingestion.parsers.base import ParsedDocument, ParsedPage


_HEADING_SIZES = {"h1": 18, "h2": 15, "h3": 13}


def parse_pdf(file_path: str, filename: str) -> ParsedDocument:
    doc = fitz.open(file_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]
        headings = []
        text_parts = []

        for block in blocks:
            if block["type"] != 0:
                continue
            for line in block.get("lines", []):
                line_text = ""
                is_heading = False
                max_size = 0

                for span in line.get("spans", []):
                    span_text = span.get("text", "").strip()
                    if not span_text:
                        continue
                    size = span.get("size", 12)
                    max_size = max(max_size, size)
                    line_text += span_text + " "

                line_text = line_text.strip()
                if not line_text:
                    continue

                if max_size >= _HEADING_SIZES["h3"] and len(line_text) < 200:
                    headings.append(line_text)
                    text_parts.append(f"\n## {line_text}\n")
                else:
                    text_parts.append(line_text)

        raw = " ".join(text_parts)
        raw = re.sub(r" {2,}", " ", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw).strip()

        if raw:
            pages.append(ParsedPage(
                page_number=page_num + 1,
                text=raw,
                headings=headings,
            ))

    doc.close()
    return ParsedDocument(
        filename=filename,
        file_type="pdf",
        pages=pages,
        total_pages=len(pages),
    )
