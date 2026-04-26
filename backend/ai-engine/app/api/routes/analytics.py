"""
Analytics routes.

GET  /api/ai/documents/{doc_id}/insights     → entity stats + keywords
GET  /api/ai/documents/{doc_id}/similar      → similar documents
POST /api/ai/documents/cluster               → K-Means cluster all docs
GET  /api/ai/knowledge-gaps                  → isolated entities
"""
from fastapi import APIRouter, HTTPException, Query, Request
from app.models.schemas import (
    SimilarityRequest, ClusterRequest, ClusterResponse,
    DocumentInsight, KnowledgeGapsResponse,
)
from app.services.analytics_service import AnalyticsService
from app.api.auth import get_user_id

router  = APIRouter()
service = AnalyticsService()


@router.get("/documents/{doc_id}/insights", response_model=DocumentInsight)
async def document_insights(doc_id: str, request: Request):
    user_id = get_user_id(request)
    insight = await service.document_insights(doc_id, user_id=user_id)
    if not insight:
        raise HTTPException(404, "Document not found")
    return insight


@router.get("/documents/{doc_id}/similar")
async def similar_documents(
    doc_id: str,
    request: Request,
    top_k:  int = Query(5, ge=1, le=20),
):
    user_id = get_user_id(request)
    results = await service.similar_documents(doc_id=doc_id, top_k=top_k, user_id=user_id)
    return {"doc_id": doc_id, "similar": results, "total": len(results)}


@router.post("/documents/cluster", response_model=ClusterResponse)
async def cluster_documents(req: ClusterRequest, request: Request):
    try:
        user_id = get_user_id(request)
        return await service.cluster_documents(
            n_clusters=req.n_clusters,
            doc_ids=req.doc_ids or None,
            user_id=user_id,
        )
    except Exception as e:
        raise HTTPException(500, f"Clustering failed: {e}")


@router.get("/knowledge-gaps", response_model=KnowledgeGapsResponse)
async def knowledge_gaps(request: Request):
    user_id = get_user_id(request)
    return await service.knowledge_gaps(user_id=user_id)
