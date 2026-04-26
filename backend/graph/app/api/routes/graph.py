"""
Graph query routes — all data scoped to the authenticated user.
"""
import json
import re
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from app.models.schemas import GraphStats, SearchResult, PathResult
from app.services.graph_service import GraphService
from app.core.neo4j_client import run_query
from app.api.auth import get_user_id

router  = APIRouter()
service = GraphService()


@router.get("/stats", response_model=GraphStats)
async def graph_stats(request: Request):
    user_id = get_user_id(request)
    return await service.get_graph_stats(user_id=user_id)


@router.get("/visualization")
async def get_visualization(request: Request, limit: int = Query(150, ge=1, le=500)):
    user_id = get_user_id(request)
    return await service.get_visualization(limit=limit, user_id=user_id)


@router.get("/alerts")
async def get_graph_alerts(request: Request):
    user_id = get_user_id(request)
    return await service.get_alerts(user_id=user_id)


@router.get("/export")
async def export_graph(request: Request, fmt: str = Query("json", regex="^(json|csv)$")):
    user_id = get_user_id(request)
    data = await service.export_graph(fmt=fmt, user_id=user_id)
    if fmt == "csv":
        return Response(content=data, media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=graph_export.csv"})
    return Response(content=data, media_type="application/json",
                    headers={"Content-Disposition": "attachment; filename=graph_export.json"})


@router.get("/documents")
async def list_documents(
    request: Request,
    skip:  int = Query(0,  ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    user_id = get_user_id(request)
    docs = await service.list_documents(skip=skip, limit=limit, user_id=user_id)
    return {"documents": docs, "total": len(docs)}


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, request: Request):
    user_id = get_user_id(request)
    doc = await service.get_document(doc_id, user_id=user_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/documents/{doc_id}/subgraph")
async def get_subgraph(doc_id: str, request: Request):
    user_id = get_user_id(request)
    return await service.get_subgraph(doc_id, user_id=user_id)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, request: Request):
    user_id = get_user_id(request)
    return await service.delete_document(doc_id, user_id=user_id)


@router.get("/search", response_model=SearchResult)
async def search_nodes(
    request: Request,
    q:     str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
):
    user_id = get_user_id(request)
    return await service.search_nodes(query=q, limit=limit, user_id=user_id)


@router.get("/nodes/{node_id}/neighbors")
async def get_neighbors(
    node_id: str,
    request: Request,
    hops:    int = Query(1, ge=1, le=3),
):
    user_id = get_user_id(request)
    neighbors = await service.get_neighbors(node_id=node_id, hops=hops, user_id=user_id)
    return {"node_id": node_id, "neighbors": neighbors, "total": len(neighbors)}


@router.get("/path", response_model=PathResult)
async def find_path(
    request: Request,
    source: str = Query(..., alias="from"),
    target: str = Query(..., alias="to"),
):
    user_id = get_user_id(request)
    return await service.find_path(source_id=source, target_id=target, user_id=user_id)


@router.delete("/clear")
async def clear_all_data(request: Request):
    """Delete current user's documents and entities from Neo4j."""
    user_id = get_user_id(request)
    return await service.clear_all(user_id=user_id)


class CypherRequest(BaseModel):
    query: str


_DOC_PATTERN_RE = re.compile(
    r"\(\s*([A-Za-z_][A-Za-z0-9_]*)?\s*:\s*Document\s*(\{[^}]*\})?\s*\)",
)


def _inject_user_filter(query: str) -> str:
    """Rewrite every `(x:Document)` / `(x:Document {...})` to include user_id filter.

    Uses a unique parameter name (`$__cg_user_id`) so it cannot collide with
    user-supplied parameters.
    """
    def repl(match):
        var   = match.group(1) or ""
        props = match.group(2) or ""
        if props:
            inner = props.strip()[1:-1].strip()
            if "user_id" in inner:
                return match.group(0)  # already filtered, leave it
            new_props = "{" + (inner + ", " if inner else "") + "user_id: $__cg_user_id}"
        else:
            new_props = "{user_id: $__cg_user_id}"
        return f"({var}:Document {new_props})"
    return _DOC_PATTERN_RE.sub(repl, query)


@router.post("/cypher")
async def run_cypher(body: CypherRequest, request: Request):
    """Execute a read-only Cypher query against Neo4j, scoped to the caller's documents.

    Every `(:Document)` pattern is rewritten server-side to include the caller's
    user_id, so even free-form queries cannot escape the user's subgraph.
    """
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required for Cypher execution")

    q = body.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Empty query")
    lowered = q.lower()
    for kw in ("create ", "merge ", "delete ", "detach ", "set ", "remove ", "drop ",
              "load csv", "call db.", "call apoc."):
        if kw in lowered:
            raise HTTPException(status_code=400, detail=f"Write/admin operations not allowed ('{kw.strip()}' detected)")

    if ":Document" not in q:
        raise HTTPException(
            status_code=400,
            detail="Cypher queries must traverse from a (:Document) node — required for per-user scoping.",
        )

    scoped_q = _inject_user_filter(q)
    try:
        rows = await run_query(scoped_q, {"__cg_user_id": user_id})
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
