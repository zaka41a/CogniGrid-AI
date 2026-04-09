"""
Qdrant vector store client for semantic search.
"""
import logging
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
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

    search_filter = None
    if file_type_filter:
        search_filter = Filter(
            must=[FieldCondition(key="file_type", match=MatchValue(value=file_type_filter))]
        )

    results = await get_qdrant().search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    )

    return [
        {
            "doc_id":    r.payload.get("job_id", ""),
            "text":      r.payload.get("text", ""),
            "chunk_idx": r.payload.get("chunk_idx", 0),
            "file_name": r.payload.get("file_name", ""),
            "score":     r.score,
        }
        for r in results
    ]
