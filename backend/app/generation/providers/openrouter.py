import httpx
from app.generation.providers.base import BaseLLMProvider
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Free models available on OpenRouter as of 2025:
# - meta-llama/llama-3.1-8b-instruct:free
# - google/gemma-2-9b-it:free
# - mistralai/mistral-7b-instruct:free
# Set LLM_MODEL in .env to use one of these when LLM_PROVIDER=openrouter


class OpenRouterProvider(BaseLLMProvider):
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set in environment")

        url = f"{settings.openrouter_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/portfolio/rag-hybrid-search",
            "X-Title": "RAG Hybrid Search",
        }
        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 1024,
        }
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=25)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            raise RuntimeError("OpenRouter request timed out after 25 s — the free LLM may be overloaded, please retry")
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"OpenRouter HTTP error: {e.response.status_code} — {e.response.text}")
        except Exception as e:
            raise RuntimeError(f"OpenRouter error: {e}")
