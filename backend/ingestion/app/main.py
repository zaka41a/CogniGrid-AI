from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.api.routes import upload, jobs
from app.db.database import init_db
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()   # create tables on startup
    yield

app = FastAPI(
    lifespan=lifespan,
    title="CogniGrid Ingestion Service",
    description="Universal file ingestion and entity extraction",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/api/ingestion", tags=["Upload"])
app.include_router(jobs.router,   prefix="/api/ingestion", tags=["Jobs"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ingestion"}
