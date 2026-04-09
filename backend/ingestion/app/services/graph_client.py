"""
GraphClient — client HTTP pour envoyer les données extraites au Graph Service.
Utilise httpx (async) pour ne pas bloquer l'event loop FastAPI.
"""
import httpx
import logging
from app.config import settings
from app.models.schemas import ExtractedDocument

logger = logging.getLogger(__name__)


class GraphClient:

    def __init__(self):
        self.base_url = settings.graph_service_url
        self.timeout  = httpx.Timeout(60.0)

    async def push_document(self, doc: ExtractedDocument) -> dict:
        """
        Envoie le document extrait au Graph Service.
        Le Graph Service créera les nœuds et relations dans Neo4j.
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/graph/ingest",
                    json=doc.model_dump(),
                )
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as e:
                logger.error(f"Graph service error: {e}")
                raise


class QdrantClient:
    """Client pour indexer les chunks dans Qdrant."""

    def __init__(self):
        self.base_url = settings.qdrant_url
        self.collection = "cognigrid_documents"

    async def upsert_chunks(self, job_id: str, chunks: list[dict]):
        """Indexe les chunks du document dans Qdrant pour la recherche RAG."""
        points = [
            {
                "id":      f"{job_id}_{chunk['chunk_idx']}",
                "vector":  chunk["embedding"],
                "payload": {
                    "job_id":    job_id,
                    "text":      chunk["text"],
                    "chunk_idx": chunk["chunk_idx"],
                },
            }
            for chunk in chunks
        ]

        async with httpx.AsyncClient() as client:
            try:
                # S'assure que la collection existe
                await client.put(
                    f"{self.base_url}/collections/{self.collection}",
                    json={"vectors": {"size": 384, "distance": "Cosine"}},
                )
                # Upsert des points
                await client.put(
                    f"{self.base_url}/collections/{self.collection}/points",
                    json={"points": points},
                )
            except Exception as e:
                logger.error(f"Qdrant error: {e}")
                raise
