from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import agent

app = FastAPI(
    title="CogniGrid Agent Service",
    description="ReAct AI Agent with tools over the CogniGrid platform",
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

app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "agent"}
