"""
Neo4j async driver wrapper.
Manages connection lifecycle and provides helper query methods.
"""
import logging
from contextlib import asynccontextmanager
from neo4j import AsyncGraphDatabase, AsyncDriver
from app.config import settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


async def init_driver() -> None:
    global _driver
    _driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    await _driver.verify_connectivity()
    logger.info("Neo4j driver connected to %s", settings.neo4j_uri)


async def close_driver() -> None:
    global _driver
    if _driver:
        await _driver.close()
        _driver = None
        logger.info("Neo4j driver closed")


def get_driver() -> AsyncDriver:
    if _driver is None:
        raise RuntimeError("Neo4j driver not initialised")
    return _driver


@asynccontextmanager
async def get_session():
    async with get_driver().session() as session:
        yield session


async def run_query(cypher: str, params: dict | None = None) -> list[dict]:
    """Execute a read or write query and return all records as dicts."""
    async with get_session() as session:
        result = await session.run(cypher, params or {})
        records = await result.data()
        return records
