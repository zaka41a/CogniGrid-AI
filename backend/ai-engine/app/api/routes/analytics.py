"""
Analytics routes.

GET  /api/ai/documents/{doc_id}/insights     → entity stats + keywords
GET  /api/ai/documents/{doc_id}/similar      → similar documents
POST /api/ai/documents/cluster               → K-Means cluster all docs
GET  /api/ai/knowledge-gaps                  → isolated entities
"""
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import (
    SimilarityRequest, ClusterRequest, ClusterResponse,
    DocumentInsight, KnowledgeGapsResponse,
)
from app.services.analytics_service import AnalyticsService

router  = APIRouter()
service = AnalyticsService()


@router.get("/documents/{doc_id}/insights", response_model=DocumentInsight)
async def document_insights(doc_id: str):
    insight = await service.document_insights(doc_id)
    if not insight:
        raise HTTPException(404, "Document not found")
    return insight


@router.get("/documents/{doc_id}/similar")
async def similar_documents(
    doc_id: str,
    top_k:  int = Query(5, ge=1, le=20),
):
    results = await service.similar_documents(doc_id=doc_id, top_k=top_k)
    return {"doc_id": doc_id, "similar": results, "total": len(results)}


@router.post("/documents/cluster", response_model=ClusterResponse)
async def cluster_documents(req: ClusterRequest):
    try:
        return await service.cluster_documents(
            n_clusters=req.n_clusters,
            doc_ids=req.doc_ids or None,
        )
    except Exception as e:
        raise HTTPException(500, f"Clustering failed: {e}")


@router.get("/knowledge-gaps", response_model=KnowledgeGapsResponse)
async def knowledge_gaps():
    return await service.knowledge_gaps()
