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

# Sentinel user_id for content visible to every authenticated user.
# Must stay in sync with backend/ingestion/.../bootstrap.py:SHARED_USER_ID
# and backend/graph/.../graph_service.py.
SHARED_USER_ID = "__shared__"


def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=settings.qdrant_url)
    return _client


def _normalise_file_types(values: list[str] | None) -> list[str]:
    """Lowercase and strip leading dots so ['xlsx', '.XLSX'] both match."""
    if not values:
        return []
    return [v.lower().lstrip(".") for v in values if v]


def _file_ext(file_name: str) -> str:
    """Return the lowercased extension of a file name without the leading dot.

    Examples:
      "foo.XLSX"            → "xlsx"
      "path/to/bar.tar.gz"  → "gz"
      "no_extension"        → ""
    """
    if not file_name:
        return ""
    base = file_name.rsplit("/", 1)[-1]
    if "." not in base:
        return ""
    return base.rsplit(".", 1)[-1].lower()


async def semantic_search(
    query: str,
    top_k: int = 5,
    file_type_filter: str = "",
    file_type_include: list[str] | None = None,
    file_type_exclude: list[str] | None = None,
    user_id: str | None = None,
) -> list[dict]:
    """Search for chunks semantically similar to the query, scoped to user_id.

    File-type filters apply to the `file_name` extension (e.g. ".xlsx") because
    the legacy ingestion payload stores only `file_name` in Qdrant — there is
    no `file_type` field on existing points. To preserve the requested top_k
    when an exclude filter is active, we over-fetch by 4× and trim after the
    Python-side filter.
    """
    query_vector = embed(query)

    include = _normalise_file_types(file_type_include)
    exclude = _normalise_file_types(file_type_exclude)
    needs_post_filter = bool(include or exclude)
    fetch_k = top_k * 4 if needs_post_filter else top_k

    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny
        must_conditions = []
        if file_type_filter:
            must_conditions.append(FieldCondition(key="file_type", match=MatchValue(value=file_type_filter)))
        if user_id:
            # Match the caller's own chunks OR any chunk in the shared scope
            # (e.g. the canonical ASSUME knowledge base bootstrapped once for
            # all users). Without this, every new account would see an empty
            # knowledge base until they re-ran Bootstrap themselves.
            must_conditions.append(
                FieldCondition(
                    key="user_id",
                    match=MatchAny(any=[user_id, SHARED_USER_ID]),
                )
            )

        qfilter = Filter(must=must_conditions) if must_conditions else None

        results = await get_qdrant().search(
            collection_name=settings.qdrant_collection,
            query_vector=query_vector,
            limit=fetch_k,
            query_filter=qfilter,
            with_payload=True,
        )
        points = results
    except Exception as e:
        logger.warning("Qdrant search failed: %s — returning empty results", e)
        return []

    chunks = [
        {
            "doc_id":    p.payload.get("job_id", "") if p.payload else "",
            "text":      p.payload.get("text", "")   if p.payload else "",
            "chunk_idx": p.payload.get("chunk_idx", 0) if p.payload else 0,
            "file_name": p.payload.get("file_name", "") if p.payload else "",
            "score":     p.score,
        }
        for p in points
    ]

    if needs_post_filter:
        before = len(chunks)
        if include:
            chunks = [c for c in chunks if _file_ext(c["file_name"]) in include]
        if exclude:
            chunks = [c for c in chunks if _file_ext(c["file_name"]) not in exclude]
        if before != len(chunks):
            logger.info(
                "file_type filter: %d → %d chunks (include=%s exclude=%s)",
                before, len(chunks), include, exclude,
            )

    return chunks[:top_k]
