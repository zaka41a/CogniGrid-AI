"""
Jobs routes - consulter le statut et la liste des jobs d'ingestion.

GET    /api/ingestion/jobs       → liste les jobs de l'utilisateur courant
GET    /api/ingestion/jobs/{id}  → statut d'un job spécifique
DELETE /api/ingestion/jobs       → supprimer tous les jobs
DELETE /api/ingestion/jobs/{id}  → supprimer un job
"""
from fastapi import APIRouter, HTTPException, Request
from app.db.job_store import JobStore
from app.services.graph_client import QdrantClient, GraphClient
from app.api.auth import get_user_id

router    = APIRouter()
job_store = JobStore()
qdrant    = QdrantClient()
graph     = GraphClient()


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
    # Enforce ownership - return 404 (not 403) so we don't leak existence
    if user_id and job.get("user_id") and job["user_id"] != user_id:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/preview")
async def preview_job(job_id: str, request: Request):
    """Return a job's indexed chunks so the UI can preview the document."""
    user_id = get_user_id(request)
    job = await job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if user_id and job.get("user_id") and job["user_id"] != user_id:
        raise HTTPException(404, "Job not found")
    chunks = await qdrant.get_chunks_by_job(job_id)
    return {"chunks": chunks}


@router.delete("/jobs")
async def clear_all_jobs(request: Request):
    """Delete current user's ingestion jobs AND their Qdrant vector chunks.

    Without the Qdrant cleanup, the RAG service kept returning chunks from
    "deleted" documents - making "Clear All Data" a half-truth. We now wipe
    the vector store too, scoped to the same user.
    """
    user_id = get_user_id(request)
    count = await job_store.delete_all(user_id=user_id)
    if user_id:
        await qdrant.delete_chunks_by_user(user_id)
    await graph.clear_all(request.headers.get("Authorization"))
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
    # Also remove this job's vector chunks (Qdrant) and graph nodes (Neo4j).
    # doc_id in the graph equals the job_id (see GraphClient.push_document).
    await qdrant.delete_chunks_by_job(job_id)
    await graph.delete_document(job_id, request.headers.get("Authorization"))
    return {"message": "Job deleted", "job_id": job_id}
