from pydantic import BaseModel
from typing import Optional
from enum import Enum


class RunStatus(str, Enum):
    pending    = "pending"
    running    = "running"
    completed  = "completed"
    failed     = "failed"
    cancelled  = "cancelled"


class RunRequest(BaseModel):
    yaml_config: str
    scenario_name: str = "cogni_scenario"
    description: str   = ""
    push_to_graph: bool = True   # ingest results into Neo4j after run


class RunInfo(BaseModel):
    run_id: str
    status: RunStatus
    scenario_name: str
    description: str
    started_at: Optional[str]  = None
    finished_at: Optional[str] = None
    duration_s: Optional[float] = None
    log_lines: list[str]        = []
    error: Optional[str]        = None
    results_summary: Optional[dict] = None
    output_files: list[str]     = []
