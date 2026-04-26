"""
Pydantic schemas for the Graph Service.
Accepts both the old format (id/label/text) and the ingestion service format (name/type/confidence).
"""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, model_validator
import uuid


# ── Input from Ingestion Service ──────────────────────────────────────────────

class ExtractedEntity(BaseModel):
    # New ingestion format
    name:       Optional[str]   = None
    type:       Optional[str]   = None
    confidence: Optional[float] = None
    source_page: Optional[int]  = None
    embedding:  Optional[list[float]] = None
    # Old format (still accepted)
    id:         Optional[str]   = None
    label:      Optional[str]   = None
    text:       Optional[str]   = None
    properties: dict[str, Any]  = {}

    @model_validator(mode='after')
    def normalise(self) -> 'ExtractedEntity':
        # Unify: prefer new format fields, fall back to old
        if self.name and not self.text:
            self.text = self.name
        if self.text and not self.name:
            self.name = self.text
        if self.type and not self.label:
            self.label = self.type
        if self.label and not self.type:
            self.type = self.label
        if not self.id:
            self.id = str(uuid.uuid5(uuid.NAMESPACE_DNS, (self.text or self.name or 'unknown')))
        # Defaults
        if not self.label:
            self.label = 'ENTITY'
        if not self.text:
            self.text = ''
        return self


class ExtractedRelation(BaseModel):
    # New ingestion format
    source:      Optional[str]  = None
    target:      Optional[str]  = None
    relation:    Optional[str]  = None
    confidence:  Optional[float] = None
    # Old format
    source_id:   Optional[str]  = None
    target_id:   Optional[str]  = None
    relation_type: Optional[str] = None
    properties:  dict[str, Any] = {}

    @model_validator(mode='after')
    def normalise(self) -> 'ExtractedRelation':
        if self.source and not self.source_id:
            self.source_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, self.source))
        if self.target and not self.target_id:
            self.target_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, self.target))
        if self.relation and not self.relation_type:
            self.relation_type = self.relation.upper()
        if self.relation_type and not self.relation:
            self.relation = self.relation_type
        if not self.relation_type:
            self.relation_type = 'RELATED_TO'
        return self


class ExtractedDocument(BaseModel):
    # New ingestion format
    job_id:    Optional[str]  = None
    raw_text:  Optional[str]  = None
    keywords:  list[str]      = []
    # Old format
    doc_id:    Optional[str]  = None
    content:   Optional[str]  = None
    title:     str            = ""
    # Shared
    file_name: str
    file_type: str
    entities:  list[ExtractedEntity]  = []
    relations: list[ExtractedRelation] = []
    metadata:  dict[str, Any] = {}
    user_id:   Optional[str]  = None

    @model_validator(mode='after')
    def normalise(self) -> 'ExtractedDocument':
        if self.job_id and not self.doc_id:
            self.doc_id = self.job_id
        if self.doc_id and not self.job_id:
            self.job_id = self.doc_id
        if not self.doc_id:
            self.doc_id = str(uuid.uuid4())
        if self.raw_text and not self.content:
            self.content = self.raw_text
        if self.content and not self.raw_text:
            self.raw_text = self.content
        if not self.title:
            self.title = self.file_name
        return self


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
