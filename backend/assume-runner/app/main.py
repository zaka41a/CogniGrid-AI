"""ASSUME Runner microservice — executes ASSUME simulations and streams results."""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.runner import router
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")

os.makedirs(settings.runs_dir, exist_ok=True)

app = FastAPI(title="ASSUME Runner", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/runner", tags=["runner"])


@app.get("/health")
async def root_health():
    return {"status": "ok", "service": "assume-runner"}
