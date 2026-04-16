"""
Qdrant vector store client for semantic search.
Supports qdrant-client >= 1.7 (uses query_points API).
"""
import logging
from qdrant_client import AsyncQdrantClient
from app.config import settings
from app.core.embedder import embed

logger = logging.getLogger(__name__)

_client: AsyncQdrantClient | None = None


def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=settings.qdrant_url)
    return _client


async def semantic_search(
    query: str,
    top_k: int = 5,
    file_type_filter: str = "",
) -> list[dict]:
    """Search for chunks semantically similar to the query."""
    query_vector = embed(query)

    try:
        # qdrant-client >= 1.7 uses query_points
        from qdrant_client.models import Filter, FieldCondition, MatchValue, QueryRequest
        qfilter = None
        if file_type_filter:
            qfilter = Filter(must=[FieldCondition(key="file_type", match=MatchValue(value=file_type_filter))])

        results = await get_qdrant().query_points(
            collection_name=settings.qdrant_collection,
            query=query_vector,
            limit=top_k,
            query_filter=qfilter,
            with_payload=True,
        )
        points = results.points
    except Exception as e:
        logger.warning("Qdrant search failed: %s — returning empty results", e)
        return []

    return [
        {
            "doc_id":    p.payload.get("job_id", "") if p.payload else "",
            "text":      p.payload.get("text", "")   if p.payload else "",
            "chunk_idx": p.payload.get("chunk_idx", 0) if p.payload else 0,
            "file_name": p.payload.get("file_name", "") if p.payload else "",
            "score":     p.score,
        }
        for p in points
    ]
