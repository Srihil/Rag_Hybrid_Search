import httpx
from app.generation.providers.base import BaseLLMProvider
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class OllamaProvider(BaseLLMProvider):
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{settings.ollama_base_url}/api/chat"
        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 1024,
            },
        }
        try:
            response = httpx.post(url, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
        except httpx.TimeoutException:
            raise RuntimeError("Ollama request timed out. Is Ollama running and is the model loaded?")
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Ollama HTTP error: {e.response.status_code} — {e.response.text}")
        except Exception as e:
            raise RuntimeError(f"Ollama error: {e}")
