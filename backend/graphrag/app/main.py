from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.embedder import get_embedder
from app.core.graph_context import close_driver
from app.api.routes import rag


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_embedder()   # pre-load (graceful if model unavailable)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Embedder init warning: %s", e)
    yield
    await close_driver()


app = FastAPI(
    title="CogniGrid GraphRAG Service",
    description="Retrieval-Augmented Generation over Knowledge Graph",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "graphrag"}
