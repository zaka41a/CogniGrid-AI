"""
LLM client — supports Ollama (local), OpenAI, and Anthropic.
Returns a plain string answer + approximate token count.
"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


async def generate(
    prompt: str,
    provider: str = "",
    model: str = "",
) -> tuple[str, int]:
    """
    Returns (answer_text, tokens_used).
    provider / model override settings defaults when provided.
    """
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    if provider == "openai":
        return await _openai(prompt, model)
    elif provider == "anthropic":
        return await _anthropic(prompt, model)
    else:
        return await _ollama(prompt, model)


# ── Ollama ────────────────────────────────────────────────────────────────────

async def _ollama(prompt: str, model: str) -> tuple[str, int]:
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {"model": model, "prompt": prompt, "stream": False}
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    answer = data.get("response", "")
    tokens = data.get("eval_count", len(answer.split()))
    return answer, tokens


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai(prompt: str, model: str) -> tuple[str, int]:
    import openai
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    answer = resp.choices[0].message.content or ""
    tokens = resp.usage.total_tokens if resp.usage else len(answer.split())
    return answer, tokens


# ── Anthropic ─────────────────────────────────────────────────────────────────

async def _anthropic(prompt: str, model: str) -> tuple[str, int]:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    resp = await client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = resp.content[0].text if resp.content else ""
    tokens = (resp.usage.input_tokens + resp.usage.output_tokens) if resp.usage else len(answer.split())
    return answer, tokens
