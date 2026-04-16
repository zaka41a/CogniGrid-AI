"""
SQLAlchemy ORM model for ingestion jobs.
"""
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class JobModel(Base):
    __tablename__ = "ingestion_jobs"

    id:              Mapped[str]      = mapped_column(String(64), primary_key=True)
    file_name:       Mapped[str]      = mapped_column(String(512))
    file_type:       Mapped[str]      = mapped_column(String(32))
    file_size:       Mapped[int]      = mapped_column(Integer, default=0)
    status:          Mapped[str]      = mapped_column(String(32), default="pending")
    progress:        Mapped[int]      = mapped_column(Integer, default=0)
    nodes_extracted: Mapped[int]      = mapped_column(Integer, default=0)
    edges_extracted: Mapped[int]      = mapped_column(Integer, default=0)
    error_message:   Mapped[str|None] = mapped_column(Text, nullable=True)
    created_at:      Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:      Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
