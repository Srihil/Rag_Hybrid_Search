import re
from dataclasses import dataclass


@dataclass
class CitationVerificationResult:
    cited_numbers: list[int]
    verified: list[int]
    invalid: list[int]
    all_valid: bool


def extract_citation_numbers(text: str) -> list[int]:
    """Pull all [N] markers from the generated answer text."""
    matches = re.findall(r"\[(\d+)\]", text)
    seen = set()
    result = []
    for m in matches:
        n = int(m)
        if n not in seen:
            seen.add(n)
            result.append(n)
    return result


def verify_citations(
    answer_text: str,
    evidence: list[dict],
) -> CitationVerificationResult:
    """
    Verifies that every [N] citation in the answer text:
    1. Is a valid integer
    2. Falls within the range of retrieved evidence (1..len(evidence))
    3. Corresponds to a chunk that was actually retrieved and presented to the LLM

    This prevents the LLM from hallucinating citations to non-existent sources.
    """
    cited = extract_citation_numbers(answer_text)
    valid_range = set(range(1, len(evidence) + 1))

    verified = [n for n in cited if n in valid_range]
    invalid = [n for n in cited if n not in valid_range]

    return CitationVerificationResult(
        cited_numbers=cited,
        verified=verified,
        invalid=invalid,
        all_valid=len(invalid) == 0,
    )


def build_verified_citations(
    answer_text: str,
    evidence: list[dict],
    citation_list: list[dict],
) -> list[dict]:
    """
    Returns only citations that were verified. Each citation includes
    the chunk metadata and a 'verified' flag. Unverified citations
    are included but flagged so the frontend can display a warning.
    """
    verification = verify_citations(answer_text, evidence)
    result = []

    for citation in citation_list:
        n = citation["source_num"]
        if n in verification.cited_numbers:
            entry = dict(citation)
            entry["verified"] = n in verification.verified
            result.append(entry)

    return result


def is_insufficient_evidence_response(answer_text: str) -> bool:
    """Detect when the LLM explicitly said it couldn't find enough information."""
    marker = "i couldn't find sufficient information"
    return marker in answer_text.lower()
