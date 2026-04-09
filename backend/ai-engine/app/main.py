from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import analytics

app = FastAPI(
    title="CogniGrid AI Engine",
    description="Document analytics, similarity, clustering, and knowledge gap detection",
    version="0.1.0",
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

app.include_router(analytics.router, prefix="/api/ai", tags=["Analytics"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}
