import re
from app.ingestion.parsers.base import ParsedDocument, ParsedPage


def parse_txt(file_path: str, filename: str) -> ParsedDocument:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    content = re.sub(r"\r\n", "\n", content)
    content = re.sub(r"\r", "\n", content)
    content = re.sub(r"\n{4,}", "\n\n\n", content)

    # Split into logical "pages" at explicit page-break markers or every ~3000 chars
    raw_pages = re.split(r"\f|\n-{40,}\n", content)
    if len(raw_pages) == 1 and len(content) > 3000:
        chunk_size = 3000
        raw_pages = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]

    pages = []
    for i, page_text in enumerate(raw_pages):
        page_text = page_text.strip()
        if not page_text:
            continue
        headings = []
        for line in page_text.split("\n"):
            line = line.strip()
            if line.isupper() and 5 < len(line) < 100:
                headings.append(line)
        pages.append(ParsedPage(
            page_number=i + 1,
            text=page_text,
            headings=headings,
        ))

    return ParsedDocument(
        filename=filename,
        file_type="txt",
        pages=pages,
        total_pages=len(pages),
    )
