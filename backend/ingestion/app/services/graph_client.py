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
        Mappe le schéma Ingestion → schéma Graph Service.
        """
        # Build entity list with stable IDs
        entity_id_map: dict[str, str] = {}  # entity name → graph ID
        entities_payload = []
        for i, e in enumerate(doc.entities):
            eid = f"{doc.job_id}_{i}"
            entity_id_map[e.name] = eid
            entities_payload.append({
                "id":         eid,
                "label":      e.type,
                "text":       e.name,
                "properties": {"confidence": str(round(e.confidence, 3))},
            })

        # Build relations using the ID map
        relations_payload = []
        for r in doc.relations:
            src_id = entity_id_map.get(r.source)
            tgt_id = entity_id_map.get(r.target)
            if src_id and tgt_id:
                relations_payload.append({
                    "source_id":     src_id,
                    "target_id":     tgt_id,
                    "relation_type": r.relation,
                    "properties":    {"confidence": str(round(r.confidence, 3))},
                })

        payload = {
            "doc_id":    doc.job_id,
            "file_name": doc.file_name,
            "file_type": doc.file_type,
            "title":     doc.file_name,
            "content":   doc.raw_text[:10_000],
            "entities":  entities_payload,
            "relations": relations_payload,
            "metadata":  doc.metadata,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/graph/ingest",
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as e:
                logger.warning(f"Graph service unavailable — continuing without graph push: {e}")
                return {"nodes_created": 0, "warning": "graph_service_unavailable"}


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
                logger.warning(f"Qdrant unavailable — continuing without vector indexing: {e}")
