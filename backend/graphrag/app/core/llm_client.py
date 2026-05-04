"""
LLM client — supports Groq, OpenAI, Anthropic, and Ollama.
Returns a plain string answer + approximate token count.
"""
import json
import logging
from collections.abc import AsyncIterator
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
    Priority: groq → openai → anthropic → ollama → context-fallback.
    """
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    if provider == "groq" and settings.groq_api_key:
        return await _groq(prompt, model or "llama-3.3-70b-versatile")
    elif provider == "openai" and settings.openai_api_key:
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
        # Auto-select: try Groq → OpenAI → Anthropic → Ollama → fallback
        if settings.groq_api_key:
            return await _groq(prompt, "llama-3.3-70b-versatile")
        if settings.openai_api_key:
            return await _openai(prompt, "gpt-4o-mini")
        if settings.anthropic_api_key:
            return await _anthropic(prompt, "claude-haiku-4-5-20251001")
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


# ── Groq (httpx direct — openai SDK has SSL/proxy issues inside Docker) ───────

async def _groq(prompt: str, model: str) -> tuple[str, int]:
    """Call Groq's chat completions endpoint with automatic 429 retry.

    Groq's free tier enforces both RPM (requests/min) and TPM (tokens/min)
    quotas. When TPM is hit the API returns HTTP 429 with a `retry-after`
    header (seconds). We honour it up to 3 times — typically the wait is
    just a few seconds — so transient quota hiccups don't bubble up as a
    user-visible failure during a demo.
    """
    import asyncio
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1024,  # was 2048 — smaller cap = less TPM burn per call
    }
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 429 and attempt < 2:
                # Honour Retry-After when present, else exponential backoff
                wait = float(resp.headers.get("retry-after", 2 * (attempt + 1)))
                wait = min(wait, 10.0)  # never block the request handler > 10s
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            break

    answer = data["choices"][0]["message"]["content"] or ""
    tokens = data.get("usage", {}).get("total_tokens", len(answer.split()))
    return answer, tokens


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


# ── OpenAI (httpx direct) ─────────────────────────────────────────────────────

async def _openai(prompt: str, model: str) -> tuple[str, int]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 2048,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    answer = data["choices"][0]["message"]["content"] or ""
    tokens = data.get("usage", {}).get("total_tokens", len(answer.split()))
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


# ─── Streaming variants ──────────────────────────────────────────────────────
# Each function yields incremental text chunks as the LLM produces them.
# A final empty yield is followed by a tuple in `_FinalUsage` form so the caller
# can record token usage. Streaming is best-effort: if the upstream API does not
# return usage in the stream, we fall back to a word-count estimate.


class _FinalUsage:
    __slots__ = ("input", "output", "total")
    def __init__(self, total: int, input_: int = 0, output: int = 0) -> None:
        self.total = total
        self.input = input_
        self.output = output


async def generate_stream(
    prompt: str,
    provider: str = "",
    model: str = "",
) -> AsyncIterator[str | _FinalUsage]:
    """Yield text chunks, then a single _FinalUsage object at the end.

    Falls back to non-streaming + single yield when the provider has no
    streaming support configured.
    """
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    try:
        if provider == "groq" and settings.groq_api_key:
            async for c in _groq_stream(prompt, model or "llama-3.3-70b-versatile"):
                yield c
            return
        if provider == "openai" and settings.openai_api_key:
            async for c in _openai_stream(prompt, model or "gpt-4o-mini"):
                yield c
            return
        if provider == "anthropic" and settings.anthropic_api_key:
            async for c in _anthropic_stream(prompt, model or "claude-haiku-4-5-20251001"):
                yield c
            return
    except Exception as e:
        logger.warning("Streaming failed for %s, falling back: %s", provider, e)

    # Fallback: non-streaming, emit the full answer as a single chunk
    text, tokens = await generate(prompt, provider=provider, model=model)
    yield text
    yield _FinalUsage(total=tokens)


async def _groq_stream(prompt: str, model: str) -> AsyncIterator[str | _FinalUsage]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 2048,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    output_chars = 0
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                    delta = obj["choices"][0]["delta"].get("content")
                    if delta:
                        output_chars += len(delta)
                        yield delta
                except Exception:
                    continue
    yield _FinalUsage(total=max(1, output_chars // 4))


async def _openai_stream(prompt: str, model: str) -> AsyncIterator[str | _FinalUsage]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 2048,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    output_chars = 0
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                    delta = obj["choices"][0]["delta"].get("content")
                    if delta:
                        output_chars += len(delta)
                        yield delta
                except Exception:
                    continue
    yield _FinalUsage(total=max(1, output_chars // 4))


async def _anthropic_stream(prompt: str, model: str) -> AsyncIterator[str | _FinalUsage]:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    in_tokens = 0
    out_tokens = 0
    async with client.messages.stream(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
        try:
            final = await stream.get_final_message()
            if final.usage:
                in_tokens = final.usage.input_tokens
                out_tokens = final.usage.output_tokens
        except Exception:
            pass
    yield _FinalUsage(total=in_tokens + out_tokens, input_=in_tokens, output=out_tokens)
