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
Be precise, cite sources when relevant, and acknowledge when information is not in the context.
"""


class RAGService:

    async def answer(self, req: RAGRequest, user_id: str | None = None) -> RAGResponse:
        conversation_id = req.conversation_id or str(uuid.uuid4())

        # 1. Semantic search (scoped to the requesting user's documents)
        raw_chunks = await semantic_search(
            query=req.query,
            top_k=req.top_k or settings.top_k,
            user_id=user_id,
        )
        sources = [SourceChunk(**c) for c in raw_chunks]

        # 2. Graph context
        graph_ctx: list[GraphContextNode] = []
        if req.use_graph_context:
            graph_ctx = await get_graph_context(
                req.query, hops=settings.graph_context_hops
            )

        # 3. Build prompt
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

        # Document context
        if sources:
            parts.append("=== Document Context ===")
            for i, s in enumerate(sources, 1):
                parts.append(f"[{i}] (file: {s.file_name}, score: {s.score:.2f})\n{s.text}")
            parts.append("")

        # Graph context
        if graph_ctx:
            parts.append("=== Knowledge Graph Context ===")
            for node in graph_ctx:
                related = ", ".join(node.relations[:5]) if node.relations else "none"
                parts.append(f"- {node.label}: {node.text} → related: {related}")
            parts.append("")

        # Conversation history
        if req.history:
            parts.append("=== Conversation History ===")
            for msg in req.history[-6:]:   # last 3 turns
                role = "User" if msg.role == "user" else "Assistant"
                parts.append(f"{role}: {msg.content}")
            parts.append("")

        parts.append(f"=== Question ===\n{req.query}")
        parts.append("\n=== Answer ===")

        return "\n".join(parts)
