from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str   # user | assistant | system
    content: str


class RAGRequest(BaseModel):
    query: str
    conversation_id: str = ""
    history: list[ChatMessage] = []
    top_k: int = 5
    use_graph_context: bool = True
    llm_provider: str = ""   # overrides default if set
    llm_model: str    = ""
    # Restrict retrieval by file extension — used to keep ASSUME chats from
    # surfacing CIM .xlsx chunks, and vice-versa, while we don't yet have a
    # proper per-module namespace. Both lists are case-insensitive, leading
    # dots stripped (e.g. "xlsx" matches both ".xlsx" and "xlsx").
    file_type_include: list[str] = []
    file_type_exclude: list[str] = []


class SourceChunk(BaseModel):
    doc_id: str
    text: str
    score: float
    chunk_idx: int
    file_name: str = ""


class GraphContextNode(BaseModel):
    entity_id: str
    text: str
    label: str
    relations: list[str] = []


class RAGResponse(BaseModel):
    answer: str
    sources: list[SourceChunk] = []
    graph_context: list[GraphContextNode] = []
    conversation_id: str = ""
    tokens_used: int = 0


class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    file_type_filter: str = ""
    file_type_include: list[str] = []
    file_type_exclude: list[str] = []


class SearchResponse(BaseModel):
    results: list[SourceChunk]
    total: int
