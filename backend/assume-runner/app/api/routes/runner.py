"""
Runner routes.

POST /api/runner/runs              → start a simulation run
GET  /api/runner/runs              → list current user's runs
GET  /api/runner/runs/{id}         → get run status + logs
GET  /api/runner/runs/{id}/logs    → stream logs (SSE)
DELETE /api/runner/runs/{id}       → cancel/delete a run (owner only)
"""
import asyncio
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import RunRequest, RunInfo
from app.core.runner import start_run, get_run, list_runs, delete_run
from app.api.auth import get_user_id

router = APIRouter()


@router.post("/runs", response_model=RunInfo, status_code=202)
async def create_run(req: RunRequest, request: Request):
    if not req.yaml_config.strip():
        raise HTTPException(400, "yaml_config is required")
    user_id = get_user_id(request)
    return await start_run(
        req_yaml=req.yaml_config,
        scenario_name=req.scenario_name,
        description=req.description,
        push_to_graph=req.push_to_graph,
        user_id=user_id,
    )


@router.get("/runs", response_model=list[RunInfo])
async def get_runs(request: Request):
    user_id = get_user_id(request)
    return list_runs(user_id=user_id)


@router.get("/runs/{run_id}", response_model=RunInfo)
async def get_run_status(run_id: str, request: Request):
    user_id = get_user_id(request)
    info = get_run(run_id, user_id=user_id)
    if not info:
        raise HTTPException(404, f"Run {run_id} not found")
    return info


@router.delete("/runs/{run_id}")
async def remove_run(run_id: str, request: Request):
    user_id = get_user_id(request)
    ok = await delete_run(run_id, user_id=user_id)
    if not ok:
        raise HTTPException(404, f"Run {run_id} not found")
    return {"message": f"Run {run_id} deleted"}


@router.get("/runs/{run_id}/logs")
async def stream_logs(run_id: str, request: Request):
    """Server-Sent Events stream of simulation logs."""
    user_id = get_user_id(request)
    info = get_run(run_id, user_id=user_id)
    if not info:
        raise HTTPException(404, f"Run {run_id} not found")

    async def event_gen():
        sent = 0
        while True:
            current = get_run(run_id, user_id=user_id)
            if not current:
                break
            lines = current.log_lines[sent:]
            for line in lines:
                yield f"data: {json.dumps({'line': line})}\n\n"
            sent += len(lines)

            if current.status in ("completed", "failed", "cancelled"):
                yield f"data: {json.dumps({'status': current.status, 'done': True, 'summary': current.results_summary})}\n\n"
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/health")
async def health():
    return {"status": "ok", "service": "assume-runner"}
