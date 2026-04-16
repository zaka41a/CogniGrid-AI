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
    Falls back gracefully when no LLM is configured/available.
    """
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    # If no API keys configured and provider isn't ollama, fall back to context-only
    if provider == "openai" and settings.openai_api_key:
        return await _openai(prompt, model or "gpt-4o-mini")
    elif provider == "anthropic" and settings.anthropic_api_key:
        return await _anthropic(prompt, model or "claude-haiku-4-5-20251001")
    elif provider == "ollama":
        try:
            return await _ollama(prompt, model)
        except Exception as e:
            logger.warning("Ollama not available (%s), using context-only fallback", e)
            return _context_fallback(prompt)
    else:
        # Auto-select: try Anthropic → OpenAI → Ollama → fallback
        if settings.anthropic_api_key:
            return await _anthropic(prompt, "claude-haiku-4-5-20251001")
        if settings.openai_api_key:
            return await _openai(prompt, "gpt-4o-mini")
        try:
            return await _ollama(prompt, model)
        except Exception:
            return _context_fallback(prompt)


def _context_fallback(prompt: str) -> tuple[str, int]:
    """
    When no LLM is available, extract the key context blocks from the prompt
    and return them as a structured answer.
    """
    lines = prompt.split("\n")
    context_lines = []
    in_doc = in_graph = False
    for line in lines:
        if "=== Document Context ===" in line:
            in_doc = True; in_graph = False; continue
        if "=== Knowledge Graph Context ===" in line:
            in_graph = True; in_doc = False; continue
        if "===" in line:
            in_doc = in_graph = False; continue
        if (in_doc or in_graph) and line.strip():
            context_lines.append(line.strip())

    if context_lines:
        answer = (
            "**Based on the knowledge graph and indexed documents:**\n\n"
            + "\n".join(f"• {l}" for l in context_lines[:12])
            + "\n\n*Note: No LLM is configured. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for AI-generated answers.*"
        )
    else:
        answer = (
            "No relevant context found in the knowledge graph for your query. "
            "Try uploading CIM files first, or configure an LLM provider (ANTHROPIC_API_KEY / OPENAI_API_KEY)."
        )
    return answer, len(answer.split())


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
