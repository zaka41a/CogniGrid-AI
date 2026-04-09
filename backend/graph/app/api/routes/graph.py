"""
Graph query routes.

GET  /api/graph/stats                   → global graph statistics
GET  /api/graph/documents               → list all documents
GET  /api/graph/documents/{doc_id}      → document + entities
GET  /api/graph/documents/{doc_id}/subgraph  → nodes + edges for visualisation
DELETE /api/graph/documents/{doc_id}    → delete document
GET  /api/graph/search?q=...            → full-text entity search
GET  /api/graph/nodes/{node_id}/neighbors   → expand neighbors
GET  /api/graph/path?from=...&to=...    → shortest path
"""
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import GraphStats, SearchResult, PathResult
from app.services.graph_service import GraphService

router  = APIRouter()
service = GraphService()


@router.get("/stats", response_model=GraphStats)
async def graph_stats():
    return await service.get_graph_stats()


@router.get("/documents")
async def list_documents(
    skip:  int = Query(0,  ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    docs = await service.list_documents(skip=skip, limit=limit)
    return {"documents": docs, "total": len(docs)}


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/documents/{doc_id}/subgraph")
async def get_subgraph(doc_id: str):
    return await service.get_subgraph(doc_id)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    return await service.delete_document(doc_id)


@router.get("/search", response_model=SearchResult)
async def search_nodes(
    q:     str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await service.search_nodes(query=q, limit=limit)


@router.get("/nodes/{node_id}/neighbors")
async def get_neighbors(
    node_id: str,
    hops:    int = Query(1, ge=1, le=3),
):
    neighbors = await service.get_neighbors(node_id=node_id, hops=hops)
    return {"node_id": node_id, "neighbors": neighbors, "total": len(neighbors)}


@router.get("/path", response_model=PathResult)
async def find_path(
    source: str = Query(..., alias="from"),
    target: str = Query(..., alias="to"),
):
    return await service.find_path(source_id=source, target_id=target)
