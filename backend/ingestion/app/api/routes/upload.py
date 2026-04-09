"""
Upload routes — gère l'upload de fichiers et le démarrage du pipeline d'ingestion.

POST /api/ingestion/upload        → upload un fichier → retourne job_id
POST /api/ingestion/upload/batch  → upload plusieurs fichiers
"""
import os
import uuid
import tempfile
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.models.schemas import UploadResponse, JobStatus, FileType
from app.core.pipeline import IngestionPipeline
from app.services.storage import StorageService
from app.services.graph_client import GraphClient, QdrantClient
from app.config import settings

router   = APIRouter()
logger   = logging.getLogger(__name__)

# In-memory job store (sera remplacé par PostgreSQL)
_jobs: dict[str, dict] = {}

pipeline     = IngestionPipeline()
storage      = StorageService()
graph_client = GraphClient()
qdrant       = QdrantClient()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    # Vérification taille
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    content   = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(400, f"File too large. Max: {settings.max_file_size_mb}MB")

    job_id    = str(uuid.uuid4())
    file_type = _detect_type(file.filename or "")

    # Sauvegarde temporaire
    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    # Initialise le job
    _jobs[job_id] = {
        "id":              job_id,
        "file_name":       file.filename,
        "file_type":       file_type,
        "file_size":       len(content),
        "status":          JobStatus.PENDING,
        "progress":        0,
        "nodes_extracted": 0,
        "error":           None,
    }

    # Lance le pipeline en arrière-plan
    background_tasks.add_task(_run_pipeline, job_id, tmp_path, file.filename)

    return UploadResponse(
        job_id=job_id,
        file_name=file.filename or "",
        file_type=file_type,
        file_size=len(content),
        status=JobStatus.PENDING,
        message="File received. Processing started.",
    )


@router.post("/upload/batch")
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
):
    results = []
    for file in files:
        content = await file.read()
        job_id  = str(uuid.uuid4())
        suffix  = os.path.splitext(file.filename or "")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        _jobs[job_id] = {"id": job_id, "file_name": file.filename, "status": JobStatus.PENDING, "progress": 0}
        background_tasks.add_task(_run_pipeline, job_id, tmp_path, file.filename)
        results.append({"job_id": job_id, "file_name": file.filename})
    return {"jobs": results}


async def _run_pipeline(job_id: str, file_path: str, file_name: str):
    """Tâche de fond — exécute le pipeline et met à jour le job."""
    _jobs[job_id]["status"] = JobStatus.PROCESSING

    async def on_progress(pct: int):
        _jobs[job_id]["progress"] = pct

    try:
        doc, chunks = await pipeline.run(
            file_path=file_path,
            job_id=job_id,
            file_name=file_name,
            on_progress=on_progress,
        )

        # Envoie au Graph Service
        result = await graph_client.push_document(doc)

        # Indexe dans Qdrant
        await qdrant.upsert_chunks(job_id, chunks)

        _jobs[job_id].update({
            "status":          JobStatus.COMPLETED,
            "progress":        100,
            "nodes_extracted": result.get("nodes_created", len(doc.entities)),
        })

    except Exception as e:
        logger.error(f"Pipeline failed for job {job_id}: {e}")
        _jobs[job_id].update({"status": JobStatus.FAILED, "error": str(e)})
    finally:
        # Nettoie le fichier temporaire
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
