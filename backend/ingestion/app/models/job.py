from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class JobStatus(str, enum.Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id               = Column(String, primary_key=True)
    file_name        = Column(String, nullable=False)
    file_type        = Column(String, nullable=False)
    file_size        = Column(Integer, nullable=False)
    storage_path     = Column(String)               # Path in MinIO
    status           = Column(SAEnum(JobStatus), default=JobStatus.PENDING)
    progress         = Column(Integer, default=0)   # 0-100
    nodes_extracted  = Column(Integer, default=0)
    edges_extracted  = Column(Integer, default=0)
    error_message    = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
