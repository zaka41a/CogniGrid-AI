"""
Agent routes.

POST /api/agent/chat                → run the agent with a message
GET  /api/agent/tools               → list available tools
POST /api/agent/assume/generate     → generate ASSUME YAML scenario
POST /api/agent/assume/predict      → predict outcome for a scenario
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.models.schemas import AgentRequest, AgentResponse
from app.core.agent import run_agent
from app.core.tools import TOOL_DESCRIPTIONS, generate_assume_scenario, predict_assume_outcome
from app.api.auth import get_auth_header

router = APIRouter()


@router.post("/chat", response_model=AgentResponse)
async def agent_chat(req: AgentRequest, request: Request):
    try:
        # Forward the caller's bearer token so the agent's tools query only
        # the caller's documents/graph data, not the global dataset.
        return await run_agent(req, auth_header=get_auth_header(request))
    except Exception as e:
        raise HTTPException(500, f"Agent failed: {e}")


@router.get("/tools")
async def list_tools():
    return {"tools": TOOL_DESCRIPTIONS}


# ── ASSUME-specific endpoints ─────────────────────────────────────────────────

class ScenarioRequest(BaseModel):
    description: str
    duration_hours: int  = 24
    market_type: str     = "day_ahead"


class PredictRequest(BaseModel):
    scenario_yaml: str
    question: str = "What will be the market clearing price and dispatch order?"


@router.post("/assume/generate")
async def assume_generate(req: ScenarioRequest, request: Request):
    """Generate a valid ASSUME YAML config from a natural language description."""
    try:
        result = await generate_assume_scenario(
            description=req.description,
            duration_hours=req.duration_hours,
            market_type=req.market_type,
            auth_header=get_auth_header(request),
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Scenario generation failed: {e}")


@router.post("/assume/predict")
async def assume_predict(req: PredictRequest, request: Request):
    """Predict simulation outcomes for a given ASSUME YAML scenario."""
    try:
        result = await predict_assume_outcome(
            scenario_yaml=req.scenario_yaml,
            question=req.question,
            auth_header=get_auth_header(request),
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Outcome prediction failed: {e}")
