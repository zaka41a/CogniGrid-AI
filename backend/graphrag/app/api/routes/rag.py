"""
GraphRAG routes.

POST /api/rag/chat        → RAG answer with sources + graph context (sync)
POST /api/rag/chat/stream → SSE stream of token deltas + final sources event
POST /api/rag/search      → semantic search only (no LLM)
GET  /api/rag/providers   → LLM provider availability status
"""
import json
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import httpx

from app.models.schemas import RAGRequest, RAGResponse, SearchRequest, SearchResponse, SourceChunk
from app.services.rag_service import RAGService
from app.core.vector_store import semantic_search
from app.core.llm_client import generate_stream, _FinalUsage
from app.core.graph_context import get_graph_context
from app.api.auth import get_user_id
from app.config import settings

router  = APIRouter()
service = RAGService()
logger  = logging.getLogger(__name__)


def _sse_event(event: str, payload: dict) -> bytes:
    """Format a Server-Sent Event with named event type and JSON payload."""
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode("utf-8")


@router.post("/chat", response_model=RAGResponse)
async def chat(request: Request, req: RAGRequest):
    try:
        user_id = get_user_id(request)
        return await service.answer(req, user_id=user_id)
    except Exception as e:
        raise HTTPException(500, f"RAG pipeline failed: {e}")


@router.post("/chat/stream")
async def chat_stream(request: Request, req: RAGRequest):
    """Stream tokens via SSE.

    Event sequence:
      event: sources  → list of retrieved chunks (sent before generation starts)
      event: token    → {delta: "..."} repeated N times
      event: usage    → {tokens, input_tokens, output_tokens} once
      event: done     → {} terminator
      event: error    → {message} if anything fails mid-stream
    """
    user_id = get_user_id(request)

    async def event_stream():
        try:
            # 1. Retrieval — same as the sync /chat path, kept short to fail fast
            raw_chunks = await semantic_search(
                query=req.query,
                top_k=req.top_k or settings.top_k,
                file_type_include=req.file_type_include,
                file_type_exclude=req.file_type_exclude,
                user_id=user_id,
            )
            raw_chunks = [c for c in raw_chunks if (c.get("score") or 0) >= 0.20]
            sources = [SourceChunk(**c) for c in raw_chunks][:6]

            graph_ctx = []
            if req.use_graph_context:
                graph_ctx = await get_graph_context(
                    req.query,
                    hops=settings.graph_context_hops,
                    user_id=user_id,
                )

            # Emit sources first so the UI can render the citation panel before
            # the answer starts streaming in.
            yield _sse_event("sources", {
                "sources": [s.model_dump() for s in sources],
                "graph_context": [g.model_dump() if hasattr(g, "model_dump") else g for g in graph_ctx],
            })

            # Empty-state short-circuit
            if not sources and not graph_ctx:
                yield _sse_event("token", {"delta": (
                    "I couldn't find any document chunks matching your question with sufficient similarity. "
                    "Try a more specific question (a full sentence with concrete terms), "
                    "or upload more documents in **Data Ingestion**."
                )})
                yield _sse_event("usage", {"tokens": 0, "input_tokens": 0, "output_tokens": 0})
                yield _sse_event("done", {})
                return

            # 2. Build prompt (reuse the sync service method)
            prompt = service._build_prompt(req, sources, graph_ctx)  # noqa: SLF001

            # 3. Stream LLM tokens
            async for chunk in generate_stream(
                prompt=prompt,
                provider=req.llm_provider,
                model=req.llm_model,
            ):
                if isinstance(chunk, _FinalUsage):
                    yield _sse_event("usage", {
                        "tokens":         chunk.total,
                        "input_tokens":   chunk.input,
                        "output_tokens":  chunk.output,
                    })
                elif isinstance(chunk, str):
                    yield _sse_event("token", {"delta": chunk})

            yield _sse_event("done", {})
        except Exception as e:
            logger.exception("Streaming RAG failed")
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if proxied
            "Connection": "keep-alive",
        },
    )


@router.post("/search", response_model=SearchResponse)
async def search(request: Request, req: SearchRequest):
    try:
        user_id = get_user_id(request)
        chunks = await semantic_search(
            query=req.query,
            top_k=req.top_k,
            file_type_filter=req.file_type_filter,
            file_type_include=req.file_type_include,
            file_type_exclude=req.file_type_exclude,
            user_id=user_id,
        )
        results = [SourceChunk(**c) for c in chunks]
        return SearchResponse(results=results, total=len(results))
    except Exception as e:
        raise HTTPException(500, f"Search failed: {e}")


@router.get("/providers")
async def providers_status():
    """Return availability status for each LLM provider."""
    statuses = []

    # ── Groq ──────────────────────────────────────────────────────────────
    if settings.groq_api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as c:
                r = await c.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"},
                    json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5},
                )
            if r.status_code == 200:
                statuses.append({"id": "groq", "status": "active", "model": "llama-3.3-70b-versatile"})
            elif r.status_code == 429:
                statuses.append({"id": "groq", "status": "quota", "model": "llama-3.3-70b-versatile"})
            else:
                statuses.append({"id": "groq", "status": "error", "model": "llama-3.3-70b-versatile"})
        except Exception:
            statuses.append({"id": "groq", "status": "error", "model": "llama-3.3-70b-versatile"})
    else:
        statuses.append({"id": "groq", "status": "unconfigured", "model": "llama-3.3-70b-versatile"})

    # ── OpenAI ────────────────────────────────────────────────────────────
    if settings.openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as c:
                r = await c.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5},
                )
            if r.status_code == 200:
                statuses.append({"id": "openai", "status": "active", "model": "gpt-4o-mini"})
            elif r.status_code == 429:
                statuses.append({"id": "openai", "status": "quota", "model": "gpt-4o-mini"})
            else:
                statuses.append({"id": "openai", "status": "error", "model": "gpt-4o-mini"})
        except Exception:
            statuses.append({"id": "openai", "status": "error", "model": "gpt-4o-mini"})
    else:
        statuses.append({"id": "openai", "status": "unconfigured", "model": "gpt-4o-mini"})

    # ── Anthropic ─────────────────────────────────────────────────────────
    if settings.anthropic_api_key:
        try:
            import anthropic as _ant
            client = _ant.AsyncAnthropic(api_key=settings.anthropic_api_key)
            await client.messages.create(
                model="claude-haiku-4-5-20251001", max_tokens=5,
                messages=[{"role": "user", "content": "hi"}],
            )
            statuses.append({"id": "anthropic", "status": "active", "model": "claude-haiku-4-5-20251001"})
        except Exception as e:
            err = str(e)
            if "credit" in err.lower() or "balance" in err.lower():
                statuses.append({"id": "anthropic", "status": "quota", "model": "claude-haiku-4-5-20251001"})
            else:
                statuses.append({"id": "anthropic", "status": "error", "model": "claude-haiku-4-5-20251001"})
    else:
        statuses.append({"id": "anthropic", "status": "unconfigured", "model": "claude-haiku-4-5-20251001"})

    # ── Ollama ────────────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=4.0) as c:
            r = await c.get(f"{settings.ollama_base_url}/api/tags")
        models = r.json().get("models", []) if r.status_code == 200 else []
        if models:
            statuses.append({"id": "ollama", "status": "active", "model": models[0]["name"]})
        else:
            statuses.append({"id": "ollama", "status": "no_models", "model": None})
    except Exception:
        statuses.append({"id": "ollama", "status": "offline", "model": None})

    return {"providers": statuses}
