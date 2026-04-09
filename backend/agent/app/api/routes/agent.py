"""
Agent routes.

POST /api/agent/chat        → run the agent with a message
GET  /api/agent/tools       → list available tools
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import AgentRequest, AgentResponse
from app.core.agent import run_agent
from app.core.tools import TOOL_DESCRIPTIONS

router = APIRouter()


@router.post("/chat", response_model=AgentResponse)
async def agent_chat(req: AgentRequest):
    try:
        return await run_agent(req)
    except Exception as e:
        raise HTTPException(500, f"Agent failed: {e}")


@router.get("/tools")
async def list_tools():
    return {"tools": TOOL_DESCRIPTIONS}
