"""
Jobs routes — consulter le statut et la liste des jobs d'ingestion.

GET /api/ingestion/jobs       → liste tous les jobs
GET /api/ingestion/jobs/{id}  → statut d'un job spécifique
DELETE /api/ingestion/jobs/{id}
"""
from fastapi import APIRouter, HTTPException
from app.api.routes.upload import _jobs
from app.models.schemas import JobStatus

router = APIRouter()


@router.get("/jobs")
async def list_jobs():
    return {"jobs": list(_jobs.values()), "total": len(_jobs)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")
    job = _jobs.pop(job_id)
    return {"message": "Job deleted", "job_id": job_id}
