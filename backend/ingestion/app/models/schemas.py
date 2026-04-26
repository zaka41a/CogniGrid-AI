from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime
import uuid


class FileType(str, Enum):
    PDF   = "pdf"
    DOCX  = "docx"
    PPTX  = "pptx"
    CSV   = "csv"
    EXCEL = "excel"
    IMAGE = "image"
    CODE  = "code"
    XML   = "xml"
    JSON  = "json"
    TXT   = "txt"
    OTHER = "other"


class JobStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    job_id: str
    file_name: str
    file_type: FileType
    file_size: int
    status: JobStatus
    message: str


# ── Job ───────────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: str
    file_name: str
    file_type: FileType
    file_size: int
    status: JobStatus
    progress: int              # 0-100
    nodes_extracted: int
    edges_extracted: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Extracted data (sent to Graph service) ────────────────────────────────────

class ExtractedEntity(BaseModel):
    name: str
    type: str                  # PERSON, ORG, LOCATION, DATE, CONCEPT...
    confidence: float
    source_page: Optional[int]
    embedding: Optional[list[float]]


class ExtractedRelation(BaseModel):
    source: str
    relation: str
    target: str
    confidence: float


class ExtractedDocument(BaseModel):
    job_id: str
    file_name: str
    file_type: str
    raw_text: str
    entities: list[ExtractedEntity]
    relations: list[ExtractedRelation]
    keywords: list[str]
    metadata: dict
    user_id: str | None = None
