"""
GraphClient — HTTP client that pushes extracted data to the Graph Service.
Uses httpx (async) so it doesn't block the FastAPI event loop.
"""
import httpx
import logging
import uuid
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
            "user_id":   doc.user_id,
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

    async def upsert_chunks(self, job_id: str, chunks: list[dict],
                            file_name: str = "", user_id: str | None = None):
        """Index document chunks in Qdrant so the RAG service can semantic-search them.

        Qdrant requires point IDs to be either unsigned integers or UUIDs — plain
        strings like ``"<job_id>_<chunk_idx>"`` are rejected with HTTP 400. We
        derive a deterministic UUIDv5 from ``(job_id, chunk_idx)`` so re-uploading
        the same document overwrites prior points instead of creating duplicates.
        """
        if not chunks:
            logger.info("upsert_chunks: no chunks to index for job %s", job_id)
            return

        points = [
            {
                "id":      str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{job_id}_{chunk['chunk_idx']}")),
                "vector":  chunk["embedding"],
                "payload": {
                    "job_id":    job_id,
                    "user_id":   user_id or "",
                    "file_name": file_name,
                    "text":      chunk["text"],
                    "chunk_idx": chunk["chunk_idx"],
                },
            }
            for chunk in chunks
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Ensure the collection exists. Qdrant returns 200/409 (already exists)
                # — both are acceptable, anything else is a real failure.
                create_resp = await client.put(
                    f"{self.base_url}/collections/{self.collection}",
                    json={"vectors": {"size": 384, "distance": "Cosine"}},
                )
                if create_resp.status_code not in (200, 409):
                    logger.warning(
                        "Qdrant create-collection returned %d: %s",
                        create_resp.status_code, create_resp.text[:200],
                    )

                # Upsert points (wait=true so we surface errors synchronously)
                upsert_resp = await client.put(
                    f"{self.base_url}/collections/{self.collection}/points?wait=true",
                    json={"points": points},
                )
                if upsert_resp.status_code != 200:
                    logger.error(
                        "Qdrant upsert failed for job %s (status=%d): %s",
                        job_id, upsert_resp.status_code, upsert_resp.text[:500],
                    )
                else:
                    logger.info(
                        "Qdrant upsert OK: %d chunks indexed for job %s (user=%s)",
                        len(points), job_id, user_id,
                    )
            except Exception as e:
                logger.error(
                    "Qdrant upsert exception for job %s: %s", job_id, e, exc_info=True
                )
