from app.generation.providers.base import BaseLLMProvider
from app.generation.providers.ollama import OllamaProvider
from app.generation.providers.openrouter import OpenRouterProvider
from app.generation.context_builder import build_context, build_citation_list
from app.generation.citations import build_verified_citations, is_insufficient_evidence_response
from app.generation.prompts import SYSTEM_PROMPT, build_user_prompt
from app.core.config import settings
from app.core.logging import get_logger
from dataclasses import dataclass

logger = get_logger(__name__)


@dataclass
class GenerationResult:
    answer: str
    citations: list[dict]
    has_sufficient_evidence: bool
    raw_llm_output: str


def get_provider() -> BaseLLMProvider:
    if settings.llm_provider == "openrouter":
        return OpenRouterProvider()
    return OllamaProvider()


def generate_answer(query: str, evidence: list[dict]) -> GenerationResult:
    """
    Takes a query and a list of retrieved evidence chunks.
    Builds a grounded prompt, calls the LLM, and verifies citations.
    """
    if not evidence:
        return GenerationResult(
            answer="I couldn't find sufficient information in the provided documents to answer this question reliably.",
            citations=[],
            has_sufficient_evidence=False,
            raw_llm_output="",
        )

    context = build_context(evidence)
    citation_list = build_citation_list(evidence)
    user_prompt = build_user_prompt(query, context)

    logger.info("llm_generation_start", provider=settings.llm_provider, model=settings.llm_model)

    provider = get_provider()
    raw_output = provider.generate(SYSTEM_PROMPT, user_prompt)

    logger.info("llm_generation_complete", output_length=len(raw_output))

    verified_citations = build_verified_citations(raw_output, evidence, citation_list)
    has_sufficient = not is_insufficient_evidence_response(raw_output)

    return GenerationResult(
        answer=raw_output,
        citations=verified_citations,
        has_sufficient_evidence=has_sufficient,
        raw_llm_output=raw_output,
    )
