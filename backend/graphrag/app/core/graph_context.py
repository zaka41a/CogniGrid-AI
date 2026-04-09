"""
Fetches graph context from Neo4j to enrich RAG responses.
Extracts entities from query → finds them in graph → retrieves neighbors.
"""
import logging
from neo4j import AsyncGraphDatabase
from app.config import settings
from app.models.schemas import GraphContextNode

logger = logging.getLogger(__name__)

_driver = None


def _get_driver():
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


async def get_graph_context(query: str, hops: int = 2) -> list[GraphContextNode]:
    """
    Simple keyword-based entity lookup:
    1. Split query into words
    2. Find matching entities in Neo4j
    3. Retrieve their neighbors up to `hops` away
    """
    words = [w.strip() for w in query.split() if len(w.strip()) > 3]
    if not words:
        return []

    # Build OR filter for entity text matches
    conditions = " OR ".join([f"toLower(e.text) CONTAINS '{w.lower()}'" for w in words[:5]])

    cypher = f"""
    MATCH (e:Entity)
    WHERE {conditions}
    WITH e LIMIT 5
    OPTIONAL MATCH (e)-[r*1..{hops}]-(neighbor:Entity)
    RETURN e.entity_id AS id, e.text AS text, e.label AS label,
           collect(DISTINCT neighbor.text) AS neighbors
    """

    try:
        async with _get_driver().session() as session:
            result = await session.run(cypher)
            records = await result.data()

        return [
            GraphContextNode(
                entity_id=r.get("id", ""),
                text=r.get("text", ""),
                label=r.get("label", ""),
                relations=[n for n in r.get("neighbors", []) if n],
            )
            for r in records
        ]
    except Exception as e:
        logger.error("Graph context fetch failed: %s", e)
        return []


async def close_driver():
    global _driver
    if _driver:
        await _driver.close()
        _driver = None
