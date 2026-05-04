"""
Bootstrap routes — auto-import canonical knowledge bases for predefined
upstream projects (currently: ASSUME from FH Aachen ADAPT).

POST /api/ingestion/bootstrap/assume
    Downloads the assume-framework/assume GitHub repo (tarball), filters
    relevant docs/source/configs, and queues each file for ingestion under
    the caller's user_id. Idempotent: skips files already ingested.

This is the proper "one-click" alternative to the cosmetic INGESTED_FILES
list that was previously shown in the frontend.
"""
from __future__ import annotations

import io
import logging
import tarfile
import tempfile
import uuid
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.api.auth import get_user_id
from app.api.routes.upload import _run_pipeline, _detect_type
from app.db.job_store import JobStore
from app.db.database import AsyncSessionLocal
from app.db.models import JobModel
from sqlalchemy import select

router = APIRouter()
logger = logging.getLogger(__name__)
job_store = JobStore()

# ── ASSUME source ─────────────────────────────────────────────────────────────
ASSUME_TARBALL = (
    "https://github.com/assume-framework/assume/archive/refs/heads/main.tar.gz"
)

# Sentinel user_id used for content that should be visible to every account
# (e.g. the canonical ASSUME knowledge base). Any service that filters chunks
# or graph nodes by user_id must additionally allow this value through.
SHARED_USER_ID = "__shared__"

# Only ingest these extensions — rest is binary, generated, or noise
_INCLUDE_EXTS = {".md", ".rst", ".py", ".yaml", ".yml"}

# Folders we never want — even if their files match the extension whitelist
_SKIP_PARTS = {
    "tests", "test", "__pycache__", "node_modules", "build",
    ".github", ".git", ".venv", "venv", "dist", "egg-info",
}

# Per-file size cap. ASSUME source files are < 200 KB; anything bigger is
# either generated or accidentally committed and not worth indexing.
_MAX_FILE_BYTES = 1 * 1024 * 1024  # 1 MB


def _is_relevant(rel_path: Path) -> bool:
    """Return True if this file should be ingested."""
    if rel_path.suffix.lower() not in _INCLUDE_EXTS:
        return False
    parts_lower = {p.lower() for p in rel_path.parts}
    if parts_lower & _SKIP_PARTS:
        return False
    return True


async def _existing_shared_file_names() -> set[str]:
    """Return file_names already ingested into the shared knowledge base.

    Used to make /bootstrap/assume idempotent — re-clicking the button does
    nothing for already-imported files instead of creating duplicates.
    """
    async with AsyncSessionLocal() as session:
        stmt = select(JobModel.file_name).where(
            JobModel.user_id == SHARED_USER_ID,
            JobModel.status.in_(["pending", "processing", "completed"]),
        )
        rows = (await session.execute(stmt)).scalars().all()
        return {fn for fn in rows if fn}


@router.post("/bootstrap/assume")
async def bootstrap_assume(request: Request, background_tasks: BackgroundTasks):
    """Download the ASSUME framework repo and ingest its docs + source as a
    SHARED knowledge base, visible to every authenticated user.

    The chunks and graph nodes are tagged with user_id="__shared__" so the
    semantic_search and graph_search filters can union them with each
    caller's private content. This means a single bootstrap run benefits
    every user on the platform — no per-user re-ingestion needed.

    Response shape:
        {
            "source": "github.com/assume-framework/assume",
            "scope": "shared",
            "files_total":   <files matching whitelist in repo>,
            "files_skipped": <already ingested into shared KB>,
            "files_queued":  <newly queued>,
            "jobs": [{ "job_id": ..., "file_name": ... }, ...]
        }
    """
    if not get_user_id(request):
        raise HTTPException(401, "Authentication required")
    # The chunks themselves go to the shared scope so every user can query them.
    user_id = SHARED_USER_ID

    # 1. Download tarball
    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            resp = await client.get(ASSUME_TARBALL)
            resp.raise_for_status()
            tar_bytes = resp.content
    except Exception as e:
        logger.exception("Failed to download ASSUME repo")
        raise HTTPException(502, f"Failed to download ASSUME repo: {e}")

    already = await _existing_shared_file_names()

    # 2. Walk the tarball — extract relevant entries to temp files
    extracted: list[tuple[str, str, int]] = []  # (file_name, tmp_path, size)
    seen_total = 0
    skipped_existing = 0
    try:
        with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:gz") as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue
                # Strip the top-level "assume-main/" folder
                parts = Path(member.name).parts
                if len(parts) < 2:
                    continue
                rel_path = Path(*parts[1:])
                if not _is_relevant(rel_path):
                    continue

                seen_total += 1
                file_name = str(rel_path)

                if file_name in already:
                    skipped_existing += 1
                    continue

                file_obj = tar.extractfile(member)
                if file_obj is None:
                    continue
                content = file_obj.read()
                if not content or len(content) > _MAX_FILE_BYTES:
                    continue

                # Persist to disk — the ingestion pipeline expects a file path
                suffix = rel_path.suffix
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(content)
                    extracted.append((file_name, tmp.name, len(content)))
    except Exception as e:
        logger.exception("Failed to extract ASSUME tarball")
        raise HTTPException(500, f"Failed to extract tarball: {e}")

    # 3. Queue each file for ingestion (reuses the standard pipeline)
    jobs: list[dict[str, Any]] = []
    for file_name, tmp_path, size in extracted:
        job_id = str(uuid.uuid4())
        file_type = _detect_type(file_name)
        await job_store.create(
            job_id=job_id,
            file_name=file_name,
            file_type=file_type.value,
            file_size=size,
            user_id=user_id,
        )
        background_tasks.add_task(_run_pipeline, job_id, tmp_path, file_name, user_id)
        jobs.append({"job_id": job_id, "file_name": file_name})

    logger.info(
        "ASSUME bootstrap (shared scope): %d candidates, %d skipped (already), %d queued",
        seen_total, skipped_existing, len(jobs),
    )

    return {
        "source": "github.com/assume-framework/assume",
        "scope":  "shared",
        "files_total":   seen_total,
        "files_skipped": skipped_existing,
        "files_queued":  len(jobs),
        "jobs": jobs,
    }
