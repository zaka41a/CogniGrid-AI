from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.neo4j_client import init_driver, close_driver
from app.core.constraints import create_constraints_and_indexes
from app.api.routes import ingest, graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_driver()
    await create_constraints_and_indexes()
    yield
    # Shutdown
    await close_driver()


app = FastAPI(
    title="CogniGrid Graph Service",
    description="Knowledge Graph operations over Neo4j",
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

app.include_router(ingest.router, prefix="/api/graph", tags=["Ingest"])
app.include_router(graph.router,  prefix="/api/graph", tags=["Graph"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "graph"}
