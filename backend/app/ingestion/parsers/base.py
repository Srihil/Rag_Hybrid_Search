from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ParsedPage:
    page_number: int
    text: str
    headings: list[str] = field(default_factory=list)


@dataclass
class ParsedDocument:
    filename: str
    file_type: str
    pages: list[ParsedPage]
    total_pages: int

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages)
