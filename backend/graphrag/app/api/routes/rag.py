"""
GraphRAG routes.

POST /api/rag/chat      → RAG answer with sources + graph context
POST /api/rag/search    → semantic search only (no LLM)
GET  /api/rag/providers → LLM provider availability status
"""
from fastapi import APIRouter, HTTPException, Request
import httpx
from app.models.schemas import RAGRequest, RAGResponse, SearchRequest, SearchResponse, SourceChunk
from app.services.rag_service import RAGService
from app.core.vector_store import semantic_search
from app.api.auth import get_user_id
from app.config import settings

router  = APIRouter()
service = RAGService()


@router.post("/chat", response_model=RAGResponse)
async def chat(request: Request, req: RAGRequest):
    try:
        user_id = get_user_id(request)
        return await service.answer(req, user_id=user_id)
    except Exception as e:
        raise HTTPException(500, f"RAG pipeline failed: {e}")


@router.post("/search", response_model=SearchResponse)
async def search(request: Request, req: SearchRequest):
    try:
        user_id = get_user_id(request)
        chunks = await semantic_search(
            query=req.query,
            top_k=req.top_k,
            file_type_filter=req.file_type_filter,
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
