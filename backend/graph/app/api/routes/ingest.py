"""
Ingest route — receives extracted documents from the Ingestion Service.

POST /api/graph/ingest   → create/update Document + Entity nodes in Neo4j
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import ExtractedDocument, IngestResponse
from app.services.graph_service import GraphService

router  = APIRouter()
service = GraphService()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_document(doc: ExtractedDocument):
    try:
        return await service.ingest_document(doc)
    except Exception as e:
        raise HTTPException(500, f"Graph ingestion failed: {e}")
