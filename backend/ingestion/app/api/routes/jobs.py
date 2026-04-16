"""
Jobs routes — consulter le statut et la liste des jobs d'ingestion.

GET    /api/ingestion/jobs       → liste tous les jobs (persistent)
GET    /api/ingestion/jobs/{id}  → statut d'un job spécifique
DELETE /api/ingestion/jobs/{id}  → supprimer un job
"""
from fastapi import APIRouter, HTTPException
from app.db.job_store import JobStore

router    = APIRouter()
job_store = JobStore()


@router.get("/jobs")
async def list_jobs():
    jobs = await job_store.list_all()
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    deleted = await job_store.delete(job_id)
    if not deleted:
        raise HTTPException(404, "Job not found")
    return {"message": "Job deleted", "job_id": job_id}
