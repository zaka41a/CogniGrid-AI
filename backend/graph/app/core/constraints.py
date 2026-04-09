"""
Create Neo4j constraints and indexes on startup.
"""
import logging
from app.core.neo4j_client import run_query

logger = logging.getLogger(__name__)

CONSTRAINTS = [
    # Unique constraints
    "CREATE CONSTRAINT doc_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.doc_id IS UNIQUE",
    "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.entity_id IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX doc_filename IF NOT EXISTS FOR (d:Document) ON (d.file_name)",
    "CREATE INDEX doc_filetype IF NOT EXISTS FOR (d:Document) ON (d.file_type)",
    "CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label)",
    "CREATE INDEX entity_text IF NOT EXISTS FOR (e:Entity) ON (e.text)",
]


async def create_constraints_and_indexes() -> None:
    for stmt in CONSTRAINTS:
        try:
            await run_query(stmt)
        except Exception as e:
            logger.warning("Constraint/index may already exist: %s", e)

    for stmt in INDEXES:
        try:
            await run_query(stmt)
        except Exception as e:
            logger.warning("Index may already exist: %s", e)

    logger.info("Neo4j constraints and indexes verified")
