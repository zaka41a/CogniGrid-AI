"""
Pydantic schemas for the Graph Service.
Mirrors the ExtractedDocument from the Ingestion Service.
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


# ── Input from Ingestion Service ──────────────────────────────────────────────

class ExtractedEntity(BaseModel):
    id: str
    label: str          # e.g. PERSON, ORG, LOCATION, CONCEPT, KEYWORD
    text: str
    properties: dict[str, Any] = {}


class ExtractedRelation(BaseModel):
    source_id: str
    target_id: str
    relation_type: str  # e.g. MENTIONS, RELATED_TO, PART_OF
    properties: dict[str, Any] = {}


class ExtractedDocument(BaseModel):
    doc_id: str
    file_name: str
    file_type: str
    title: str = ""
    content: str = ""
    entities: list[ExtractedEntity] = []
    relations: list[ExtractedRelation] = []
    metadata: dict[str, Any] = {}


# ── Responses ─────────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    doc_id: str
    nodes_created: int
    relationships_created: int
    message: str = "Document ingested successfully"


class NodeResponse(BaseModel):
    id: str
    label: str
    properties: dict[str, Any]


class GraphStats(BaseModel):
    total_nodes: int
    total_relationships: int
    node_labels: dict[str, int]
    relationship_types: dict[str, int]


class SearchResult(BaseModel):
    nodes: list[NodeResponse]
    total: int


class PathResult(BaseModel):
    path: list[dict[str, Any]]
    length: int
