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


async def get_graph_context(query: str, hops: int = 2,
                            user_id: str | None = None) -> list[GraphContextNode]:
    """
    Keyword-based entity lookup, scoped to the caller's documents.
    1. Split query into words
    2. Find matching entities mentioned in the user's Document nodes
    3. Retrieve their neighbors up to `hops` away (still within the user's subgraph)
    """
    words = [w.strip() for w in query.split() if len(w.strip()) > 3]
    if not words:
        return []

    # Build OR filter for entity text matches (parameterised per word)
    word_params = {f"w{i}": w.lower() for i, w in enumerate(words[:5])}
    conditions = " OR ".join(
        [f"toLower(e.text) CONTAINS $w{i}" for i in range(len(word_params))]
    )

    if user_id:
        cypher = f"""
        MATCH (d:Document {{user_id: $user_id}})-[:MENTIONS|HAS_KEYWORD]->(e:Entity)
        WHERE {conditions}
        WITH DISTINCT e LIMIT 5
        OPTIONAL MATCH (e)-[r*1..{hops}]-(neighbor:Entity)
        WHERE EXISTS {{ MATCH (d2:Document {{user_id: $user_id}})-[:MENTIONS|HAS_KEYWORD]->(neighbor) }}
        RETURN e.entity_id AS id, e.text AS text, e.label AS label,
               collect(DISTINCT neighbor.text) AS neighbors
        """
    else:
        cypher = f"""
        MATCH (e:Entity)
        WHERE {conditions}
        WITH e LIMIT 5
        OPTIONAL MATCH (e)-[r*1..{hops}]-(neighbor:Entity)
        RETURN e.entity_id AS id, e.text AS text, e.label AS label,
               collect(DISTINCT neighbor.text) AS neighbors
        """

    params = {**word_params}
    if user_id:
        params["user_id"] = user_id

    try:
        async with _get_driver().session() as session:
            result = await session.run(cypher, params)
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
