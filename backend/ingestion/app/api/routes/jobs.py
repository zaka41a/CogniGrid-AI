"""
Jobs routes — consulter le statut et la liste des jobs d'ingestion.

GET    /api/ingestion/jobs       → liste les jobs de l'utilisateur courant
GET    /api/ingestion/jobs/{id}  → statut d'un job spécifique
DELETE /api/ingestion/jobs       → supprimer tous les jobs
DELETE /api/ingestion/jobs/{id}  → supprimer un job
"""
from fastapi import APIRouter, HTTPException, Request
from app.db.job_store import JobStore
from app.api.auth import get_user_id

router    = APIRouter()
job_store = JobStore()


@router.get("/jobs")
async def list_jobs(request: Request):
    user_id = get_user_id(request)
    jobs = await job_store.list_all(user_id=user_id)
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    user_id = get_user_id(request)
    job = await job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    # Enforce ownership — return 404 (not 403) so we don't leak existence
    if user_id and job.get("user_id") and job["user_id"] != user_id:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/jobs")
async def clear_all_jobs(request: Request):
    """Delete current user's ingestion jobs."""
    user_id = get_user_id(request)
    count = await job_store.delete_all(user_id=user_id)
    return {"message": "Jobs cleared", "deleted": count}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    user_id = get_user_id(request)
    job = await job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if user_id and job.get("user_id") and job["user_id"] != user_id:
        raise HTTPException(404, "Job not found")
    deleted = await job_store.delete(job_id)
    if not deleted:
        raise HTTPException(404, "Job not found")
    return {"message": "Job deleted", "job_id": job_id}
