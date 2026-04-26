"""
Upload routes — gère l'upload de fichiers et le démarrage du pipeline d'ingestion.

POST /api/ingestion/upload        → upload un fichier → retourne job_id
POST /api/ingestion/upload/batch  → upload plusieurs fichiers
"""
import os
import uuid
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Request
from app.models.schemas import UploadResponse, FileType
from app.core.pipeline import IngestionPipeline
from app.services.storage import StorageService
from app.services.graph_client import GraphClient, QdrantClient
from app.db.job_store import JobStore
from app.api.auth import get_user_id
from app.config import settings

router   = APIRouter()
logger   = logging.getLogger(__name__)

pipeline     = IngestionPipeline()
storage      = StorageService()
graph_client = GraphClient()
qdrant       = QdrantClient()
job_store    = JobStore()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    user_id   = get_user_id(request)
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    content   = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    job_id    = str(uuid.uuid4())
    file_type = _detect_type(file.filename or "")

    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    await job_store.create(
        job_id=job_id,
        file_name=file.filename or "",
        file_type=file_type.value,
        file_size=len(content),
        user_id=user_id,
    )

    background_tasks.add_task(_run_pipeline, job_id, tmp_path, file.filename or "", user_id)

    return UploadResponse(
        job_id=job_id,
        file_name=file.filename or "",
        file_type=file_type,
        file_size=len(content),
        status="pending",
        message="File received. Processing started.",
    )


@router.post("/upload/batch")
async def upload_batch(
    request: Request,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
):
    user_id = get_user_id(request)
    results = []
    for file in files:
        content   = await file.read()
        job_id    = str(uuid.uuid4())
        file_type = _detect_type(file.filename or "")
        suffix    = os.path.splitext(file.filename or "")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        await job_store.create(
            job_id=job_id,
            file_name=file.filename or "",
            file_type=file_type.value,
            file_size=len(content),
            user_id=user_id,
        )
        background_tasks.add_task(_run_pipeline, job_id, tmp_path, file.filename or "", user_id)
        results.append({"job_id": job_id, "file_name": file.filename})
    return {"jobs": results}


async def _run_pipeline(job_id: str, file_path: str, file_name: str, user_id: str | None = None):
    await job_store.update_status(job_id, "processing", progress=0)

    async def on_progress(pct: int):
        await job_store.update_status(job_id, "processing", progress=pct)

    try:
        doc, chunks = await pipeline.run(
            file_path=file_path,
            job_id=job_id,
            file_name=file_name,
            on_progress=on_progress,
        )
        doc.user_id = user_id  # tag document with owner before pushing to graph

        result = await graph_client.push_document(doc)
        await qdrant.upsert_chunks(job_id, chunks, file_name=file_name, user_id=user_id)

        await job_store.update_status(
            job_id, "completed",
            progress=100,
            nodes_extracted=result.get("nodes_created", len(doc.entities)),
        )

    except Exception as e:
        logger.error(f"Pipeline failed for job {job_id}: {e}", exc_info=True)
        await job_store.update_status(job_id, "failed", error=str(e))
    finally:
        if os.path.exists(file_path):
            os.unlink(file_path)


def _detect_type(filename: str) -> FileType:
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        ".pdf": FileType.PDF, ".docx": FileType.DOCX, ".doc": FileType.DOCX,
        ".pptx": FileType.PPTX, ".csv": FileType.CSV, ".tsv": FileType.CSV,
        ".xlsx": FileType.EXCEL, ".xls": FileType.EXCEL,
        ".jpg": FileType.IMAGE, ".jpeg": FileType.IMAGE, ".png": FileType.IMAGE,
        ".json": FileType.JSON, ".xml": FileType.XML, ".txt": FileType.TXT,
    }
    return mapping.get(ext, FileType.OTHER)
