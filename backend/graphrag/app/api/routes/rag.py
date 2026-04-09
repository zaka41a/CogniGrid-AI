"""
GraphRAG routes.

POST /api/rag/chat      → RAG answer with sources + graph context
POST /api/rag/search    → semantic search only (no LLM)
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import RAGRequest, RAGResponse, SearchRequest, SearchResponse, SourceChunk
from app.services.rag_service import RAGService
from app.core.vector_store import semantic_search

router  = APIRouter()
service = RAGService()


@router.post("/chat", response_model=RAGResponse)
async def chat(req: RAGRequest):
    try:
        return await service.answer(req)
    except Exception as e:
        raise HTTPException(500, f"RAG pipeline failed: {e}")


@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    try:
        chunks = await semantic_search(
            query=req.query,
            top_k=req.top_k,
            file_type_filter=req.file_type_filter,
        )
        results = [SourceChunk(**c) for c in chunks]
        return SearchResponse(results=results, total=len(results))
    except Exception as e:
        raise HTTPException(500, f"Search failed: {e}")
