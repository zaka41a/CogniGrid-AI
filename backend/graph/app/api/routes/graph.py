"""
Graph query routes.

GET  /api/graph/stats                        → global graph statistics
GET  /api/graph/visualization                → all nodes + edges for graph canvas
GET  /api/graph/alerts                       → auto-generated alerts from graph data
GET  /api/graph/export                       → export graph as JSON/CSV
GET  /api/graph/documents                    → list all documents
GET  /api/graph/documents/{doc_id}           → document + entities
GET  /api/graph/documents/{doc_id}/subgraph  → nodes + edges for visualisation
DELETE /api/graph/documents/{doc_id}         → delete document
GET  /api/graph/search?q=...                 → full-text entity search
GET  /api/graph/nodes/{node_id}/neighbors    → expand neighbors
GET  /api/graph/path?from=...&to=...         → shortest path
"""
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from app.models.schemas import GraphStats, SearchResult, PathResult
from app.services.graph_service import GraphService
from app.core.neo4j_client import run_query

router  = APIRouter()
service = GraphService()


@router.get("/stats", response_model=GraphStats)
async def graph_stats():
    return await service.get_graph_stats()


@router.get("/visualization")
async def get_visualization(limit: int = Query(150, ge=1, le=500)):
    """Return all nodes and edges for the graph canvas (Cytoscape)."""
    return await service.get_visualization(limit=limit)


@router.get("/alerts")
async def get_graph_alerts():
    """Auto-generate alerts from graph data (isolated nodes, overloaded lines, etc.)."""
    return await service.get_alerts()


@router.get("/export")
async def export_graph(fmt: str = Query("json", regex="^(json|csv)$")):
    """Export graph as JSON or CSV."""
    data = await service.export_graph(fmt=fmt)
    if fmt == "csv":
        return Response(content=data, media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=graph_export.csv"})
    return Response(content=data, media_type="application/json",
                    headers={"Content-Disposition": "attachment; filename=graph_export.json"})


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


@router.delete("/clear")
async def clear_all_data():
    """Delete ALL nodes and relationships from Neo4j and clear Qdrant vectors."""
    return await service.clear_all()


class CypherRequest(BaseModel):
    query: str


@router.post("/cypher")
async def run_cypher(body: CypherRequest):
    """Execute a read-only Cypher query against Neo4j and return rows as JSON."""
    q = body.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Empty query")
    # Block mutating keywords for safety
    lowered = q.lower()
    for kw in ("create ", "merge ", "delete ", "detach ", "set ", "remove ", "drop "):
        if kw in lowered:
            raise HTTPException(status_code=400, detail=f"Write operations are not allowed via this endpoint ('{kw.strip()}' detected)")
    try:
        rows = await run_query(q)
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
