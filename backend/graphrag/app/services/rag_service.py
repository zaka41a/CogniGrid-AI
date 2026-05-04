"""
RAGService — the core GraphRAG pipeline.

Pipeline:
  1. Semantic search in Qdrant → top-K chunks
  2. Graph context from Neo4j → related entities
  3. Build prompt: system + context + chat history + query
  4. LLM call → answer
  5. Return answer + sources + graph_context
"""
import logging
import uuid
from app.config import settings
from app.core.vector_store import semantic_search
from app.core.graph_context import get_graph_context
from app.core.llm_client import generate
from app.models.schemas import (
    RAGRequest, RAGResponse, SourceChunk, GraphContextNode
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are CogniGrid AI, an intelligent knowledge assistant.
You answer questions based on the provided document context and knowledge graph data.
Be precise, cite sources with [N] markers, and acknowledge when information is not in the context.
"""

# ── Prompt size guards ────────────────────────────────────────────────────────
# Groq's llama-3.3-70b-versatile model technically accepts ~32k tokens, BUT the
# free tier enforces a TPM (tokens per minute) cap around ~6k. A single bulky
# request consumes the whole minute's budget and the next call gets HTTP 429
# even with a fresh API key. We therefore truncate aggressively on the prompt
# side so a typical query stays well under ~1.5k tokens (≈ 6k chars), letting
# users run 3-4 requests per minute on the free tier without hitting 429.
MAX_CHUNK_CHARS     = 700    # per source chunk
MAX_TOTAL_CTX_CHARS = 5000   # total characters fed to the LLM as document context
MAX_SOURCES         = 4      # absolute cap on chunks injected into the prompt
MIN_SCORE           = 0.20   # discard chunks below this similarity threshold
EMPTY_STATE_ANSWER = (
    "I couldn't find any document chunks matching your question with sufficient similarity. "
    "This usually means the question is too short or vague (try a full sentence with concrete terms), "
    "or no indexed document covers this topic. "
    "Try a more specific ASSUME-related question, or upload more documents in **Data Ingestion**."
)


class RAGService:

    async def answer(self, req: RAGRequest, user_id: str | None = None) -> RAGResponse:
        conversation_id = req.conversation_id or str(uuid.uuid4())

        # 1. Semantic search (scoped to the requesting user's documents)
        raw_chunks = await semantic_search(
            query=req.query,
            top_k=req.top_k or settings.top_k,
            file_type_include=req.file_type_include,
            file_type_exclude=req.file_type_exclude,
            user_id=user_id,
        )
        # Filter out very weak matches — they pollute the prompt without adding
        # any signal, especially for short queries like "hi" that have no semantic
        # overlap with anything indexed.
        raw_chunks = [c for c in raw_chunks if (c.get("score") or 0) >= MIN_SCORE]
        sources = [SourceChunk(**c) for c in raw_chunks][:MAX_SOURCES]

        # 2. Graph context (scoped to the requesting user's subgraph)
        graph_ctx: list[GraphContextNode] = []
        if req.use_graph_context:
            graph_ctx = await get_graph_context(
                req.query, hops=settings.graph_context_hops, user_id=user_id,
            )

        # 2b. Empty-state short-circuit — don't bother the LLM if we have nothing
        # to ground the answer in. Saves a token-burning round trip and gives the
        # user actionable feedback instead of a vague refusal.
        if not sources and not graph_ctx:
            logger.info(
                "RAG empty-state for user=%s query=%r — no sources, no graph context",
                user_id, req.query[:80],
            )
            return RAGResponse(
                answer=EMPTY_STATE_ANSWER,
                sources=[],
                graph_context=[],
                conversation_id=conversation_id,
                tokens_used=0,
            )

        # 3. Build prompt (with hard size guards)
        prompt = self._build_prompt(req, sources, graph_ctx)

        # 4. LLM call
        answer_text, tokens = await generate(
            prompt=prompt,
            provider=req.llm_provider,
            model=req.llm_model,
        )

        return RAGResponse(
            answer=answer_text,
            sources=sources,
            graph_context=graph_ctx,
            conversation_id=conversation_id,
            tokens_used=tokens,
        )

    def _build_prompt(
        self,
        req: RAGRequest,
        sources: list[SourceChunk],
        graph_ctx: list[GraphContextNode],
    ) -> str:
        parts = [SYSTEM_PROMPT, "\n"]

        # Document context — truncate per chunk AND cap total context size so we
        # never exceed Groq's input limit even with very long XML/CSV chunks.
        if sources:
            parts.append("=== Document Context ===")
            total_ctx = 0
            for i, s in enumerate(sources, 1):
                text = (s.text or "")[:MAX_CHUNK_CHARS]
                if total_ctx + len(text) > MAX_TOTAL_CTX_CHARS:
                    parts.append(f"[truncated — {len(sources) - i + 1} more sources omitted]")
                    break
                parts.append(f"[{i}] (file: {s.file_name}, score: {s.score:.2f})\n{text}")
                total_ctx += len(text)
            parts.append("")

        # Graph context (already small — node texts only)
        if graph_ctx:
            parts.append("=== Knowledge Graph Context ===")
            for node in graph_ctx[:20]:
                related = ", ".join((node.relations or [])[:5]) or "none"
                parts.append(f"- {node.label}: {(node.text or '')[:200]} → related: {related}")
            parts.append("")

        # Conversation history
        if req.history:
            parts.append("=== Conversation History ===")
            for msg in req.history[-6:]:   # last 3 turns
                role = "User" if msg.role == "user" else "Assistant"
                parts.append(f"{role}: {(msg.content or '')[:500]}")
            parts.append("")

        parts.append(f"=== Question ===\n{req.query[:1000]}")
        parts.append("\n=== Answer ===")

        return "\n".join(parts)
