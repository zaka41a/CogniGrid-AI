from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "CogniGrid Ingestion Service"
    app_env: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://cognigrid:cg_secret_2024@cg-postgres:5432/cognigrid"

    # Redis
    redis_url: str = "redis://cg-redis:6379/0"

    # MinIO
    minio_url: str = "http://cg-minio:9000"
    minio_root_user: str = "cognigrid_admin"
    minio_root_password: str = "cg_minio_2024"
    minio_bucket: str = "cognigrid-files"

    # Inter-service
    graph_service_url: str = "http://cg-graph:8002"
    qdrant_url: str = "http://cg-qdrant:6333"

    # AI / Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    spacy_model: str = "en_core_web_sm"

    # Upload limits
    max_file_size_mb: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
