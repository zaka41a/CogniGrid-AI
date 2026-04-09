from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class AgentMessage(BaseModel):
    role: str    # user | assistant | tool
    content: str
    tool_call: str | None = None


class AgentRequest(BaseModel):
    message: str
    session_id: str = ""
    history: list[AgentMessage] = []
    llm_provider: str = ""
    llm_model: str    = ""


class ToolCall(BaseModel):
    tool: str
    args: dict[str, Any]
    result: Any = None


class AgentResponse(BaseModel):
    answer: str
    session_id: str
    tool_calls: list[ToolCall] = []
    reasoning: str = ""
    tokens_used: int = 0


class SessionHistory(BaseModel):
    session_id: str
    messages: list[AgentMessage]
    total: int
