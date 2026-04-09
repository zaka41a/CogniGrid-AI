"""
Agent tools — each tool wraps an HTTP call to an internal service.
"""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_http = httpx.AsyncClient(timeout=60.0)


async def search_knowledge_base(query: str, top_k: int = 5) -> dict:
    """Semantic search in the document knowledge base."""
    resp = await _http.post(
        f"{settings.rag_service_url}/api/rag/search",
        json={"query": query, "top_k": top_k},
    )
    resp.raise_for_status()
    return resp.json()


async def ask_knowledge_base(query: str, use_graph: bool = True) -> dict:
    """Full GraphRAG Q&A over ingested documents."""
    resp = await _http.post(
        f"{settings.rag_service_url}/api/rag/chat",
        json={"query": query, "use_graph_context": use_graph},
    )
    resp.raise_for_status()
    return resp.json()


async def get_graph_stats() -> dict:
    """Get knowledge graph statistics."""
    resp = await _http.get(f"{settings.graph_service_url}/api/graph/stats")
    resp.raise_for_status()
    return resp.json()


async def search_graph(query: str, limit: int = 10) -> dict:
    """Full-text search across graph entities."""
    resp = await _http.get(
        f"{settings.graph_service_url}/api/graph/search",
        params={"q": query, "limit": limit},
    )
    resp.raise_for_status()
    return resp.json()


async def get_document_insights(doc_id: str) -> dict:
    """Get AI-generated insights for a document."""
    resp = await _http.get(f"{settings.ai_engine_url}/api/ai/documents/{doc_id}/insights")
    resp.raise_for_status()
    return resp.json()


async def find_similar_documents(doc_id: str, top_k: int = 5) -> dict:
    """Find documents similar to a given document."""
    resp = await _http.get(
        f"{settings.ai_engine_url}/api/ai/documents/{doc_id}/similar",
        params={"top_k": top_k},
    )
    resp.raise_for_status()
    return resp.json()


async def list_documents(limit: int = 10) -> dict:
    """List all ingested documents."""
    resp = await _http.get(
        f"{settings.graph_service_url}/api/graph/documents",
        params={"limit": limit},
    )
    resp.raise_for_status()
    return resp.json()


# Tool registry for the agent
TOOLS = {
    "search_knowledge_base":  search_knowledge_base,
    "ask_knowledge_base":     ask_knowledge_base,
    "get_graph_stats":        get_graph_stats,
    "search_graph":           search_graph,
    "get_document_insights":  get_document_insights,
    "find_similar_documents": find_similar_documents,
    "list_documents":         list_documents,
}

TOOL_DESCRIPTIONS = """
Available tools:
1. search_knowledge_base(query, top_k=5) — semantic search, returns relevant text chunks
2. ask_knowledge_base(query, use_graph=True) — RAG answer with sources from documents
3. get_graph_stats() — knowledge graph statistics (node/edge counts)
4. search_graph(query, limit=10) — search entities in knowledge graph
5. get_document_insights(doc_id) — entity stats and keywords for a document
6. find_similar_documents(doc_id, top_k=5) — find semantically similar docs
7. list_documents(limit=10) — list all ingested documents
"""
