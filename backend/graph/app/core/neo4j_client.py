"""
Neo4j async driver wrapper.
Manages connection lifecycle with auto-reconnect on stale connections.
"""
import logging
import asyncio
from neo4j import AsyncGraphDatabase, AsyncDriver
from neo4j.exceptions import ServiceUnavailable, SessionExpired
from app.config import settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


async def init_driver() -> None:
    global _driver
    _driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
        max_connection_pool_size=20,
        connection_acquisition_timeout=30.0,
        max_transaction_retry_time=15.0,
        keep_alive=True,
    )
    await _driver.verify_connectivity()
    logger.info("Neo4j driver connected to %s", settings.neo4j_uri)


async def _ensure_driver() -> AsyncDriver:
    """Return a connected driver, reinitialising if needed."""
    global _driver
    if _driver is None:
        await init_driver()
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver:
        await _driver.close()
        _driver = None
        logger.info("Neo4j driver closed")


async def run_query(cypher: str, params: dict | None = None, retries: int = 3) -> list[dict]:
    """Execute a read or write query; auto-reconnects on stale connection."""
    for attempt in range(1, retries + 1):
        try:
            driver = await _ensure_driver()
            async with driver.session() as session:
                result = await session.run(cypher, params or {})
                return await result.data()
        except (ServiceUnavailable, SessionExpired, OSError) as e:
            logger.warning("Neo4j connection error (attempt %d/%d): %s", attempt, retries, e)
            global _driver
            # Force reconnect
            if _driver:
                try:
                    await _driver.close()
                except Exception:
                    pass
            _driver = None
            if attempt < retries:
                await asyncio.sleep(2 ** attempt)   # 2s, 4s backoff
            else:
                raise
