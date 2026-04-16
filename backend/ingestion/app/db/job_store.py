"""
JobStore — persistent CRUD for ingestion jobs using SQLAlchemy.
Replaces the in-memory _jobs dict in upload.py.
"""
from datetime import datetime
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal
from .models import JobModel


class JobStore:
    """Async job store backed by SQLAlchemy (SQLite locally, PostgreSQL in prod)."""

    async def create(self, job_id: str, file_name: str, file_type: str, file_size: int) -> dict:
        async with AsyncSessionLocal() as session:
            job = JobModel(
                id=job_id,
                file_name=file_name,
                file_type=file_type,
                file_size=file_size,
                status="pending",
                progress=0,
                nodes_extracted=0,
                edges_extracted=0,
            )
            session.add(job)
            await session.commit()
            return self._to_dict(job)

    async def get(self, job_id: str) -> dict | None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(JobModel).where(JobModel.id == job_id))
            job = result.scalar_one_or_none()
            return self._to_dict(job) if job else None

    async def list_all(self) -> list[dict]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(JobModel).order_by(JobModel.created_at.desc())
            )
            return [self._to_dict(j) for j in result.scalars().all()]

    async def update_status(self, job_id: str, status: str, progress: int = None,
                             nodes_extracted: int = None, error: str = None):
        async with AsyncSessionLocal() as session:
            values: dict = {"status": status, "updated_at": datetime.utcnow()}
            if progress is not None:       values["progress"] = progress
            if nodes_extracted is not None: values["nodes_extracted"] = nodes_extracted
            if error is not None:          values["error_message"] = error
            await session.execute(
                update(JobModel).where(JobModel.id == job_id).values(**values)
            )
            await session.commit()

    async def delete(self, job_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(delete(JobModel).where(JobModel.id == job_id))
            await session.commit()
            return result.rowcount > 0

    async def count_by_status(self) -> dict:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(JobModel.status, func.count(JobModel.id))
                .group_by(JobModel.status)
            )
            return dict(result.all())

    @staticmethod
    def _to_dict(job: JobModel) -> dict:
        return {
            "id":              job.id,
            "file_name":       job.file_name,
            "file_type":       job.file_type,
            "file_size":       job.file_size,
            "status":          job.status,
            "progress":        job.progress,
            "nodes_extracted": job.nodes_extracted,
            "edges_extracted": job.edges_extracted,
            "error":           job.error_message,
            "created_at":      job.created_at.isoformat() if job.created_at else None,
            "updated_at":      job.updated_at.isoformat() if job.updated_at else None,
        }
