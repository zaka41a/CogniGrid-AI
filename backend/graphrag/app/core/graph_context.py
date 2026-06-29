"""
Fetches graph context from Neo4j to enrich RAG responses.
Extracts entities from query → finds them in graph → retrieves neighbors.
"""
import logging
import re
from neo4j import AsyncGraphDatabase
from app.config import settings
from app.models.schemas import GraphContextNode

logger = logging.getLogger(__name__)

_driver = None

SHARED_USER_ID = "__shared__"


def _query_tokens(query: str) -> list[str]:
    """Extract candidate entity tokens from a query.

    Keeps real words (len >= 4) and short identifiers that contain a digit or
    underscore (SM_1, G1, SS_4bus), after stripping punctuation. This lets the
    graph lookup catch entity names that vector search over text misses.
    """
    raw = re.findall(r"[A-Za-z0-9_]+", query)
    out: list[str] = []
    for t in raw:
        if len(t) >= 4 or (len(t) >= 2 and re.search(r"[\d_]", t)):
            low = t.lower()
            if low not in out:
                out.append(low)
    return out[:8]


def _get_driver():
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


async def get_graph_context(query: str, hops: int = 2,
                            user_id: str | None = None,
                            scope: str = "personal") -> list[GraphContextNode]:
    """
    Keyword-based entity lookup, scoped to the caller's documents.
    1. Split query into words
    2. Find matching entities mentioned in the user's Document nodes
    3. Retrieve their neighbors up to `hops` away (still within the user's subgraph)
    """
    words = _query_tokens(query)
    if not words:
        return []

    # "assume" scope reads the shared ASSUME KB; otherwise the caller's own graph.
    effective_id = SHARED_USER_ID if scope == "assume" else user_id

    # Build OR filter for entity text matches (parameterised per word)
    word_params = {f"w{i}": w for i, w in enumerate(words)}
    conditions = " OR ".join(
        [f"toLower(e.text) CONTAINS $w{i}" for i in range(len(word_params))]
    )

    if effective_id:
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
    if effective_id:
        params["user_id"] = effective_id

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
