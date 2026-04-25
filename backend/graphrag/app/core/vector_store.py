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
    user_id: str | None = None,
) -> list[dict]:
    """Search for chunks semantically similar to the query, scoped to user_id."""
    query_vector = embed(query)

    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        must_conditions = []
        if file_type_filter:
            must_conditions.append(FieldCondition(key="file_type", match=MatchValue(value=file_type_filter)))
        if user_id:
            must_conditions.append(FieldCondition(key="user_id", match=MatchValue(value=user_id)))
        qfilter = Filter(must=must_conditions) if must_conditions else None

        results = await get_qdrant().search(
            collection_name=settings.qdrant_collection,
            query_vector=query_vector,
            limit=top_k,
            query_filter=qfilter,
            with_payload=True,
        )
        points = results
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
