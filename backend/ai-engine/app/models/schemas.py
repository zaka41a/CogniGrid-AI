from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class SimilarityRequest(BaseModel):
    doc_id: str
    top_k: int = 5


class SimilarityResult(BaseModel):
    doc_id: str
    file_name: str
    score: float


class ClusterRequest(BaseModel):
    n_clusters: int = 5
    doc_ids: list[str] = []   # empty = use all


class ClusterResult(BaseModel):
    cluster_id: int
    doc_ids: list[str]
    keywords: list[str] = []


class ClusterResponse(BaseModel):
    clusters: list[ClusterResult]
    total_docs: int


class DocumentInsight(BaseModel):
    doc_id: str
    file_name: str
    top_entities: list[dict[str, Any]]
    top_keywords: list[str]
    entity_count: int
    relation_count: int
    file_type: str


class KnowledgeGap(BaseModel):
    topic: str
    mentioned_count: int
    connected_docs: int
    description: str = ""


class KnowledgeGapsResponse(BaseModel):
    gaps: list[KnowledgeGap]
    total_entities: int
    isolated_entity_ratio: float
