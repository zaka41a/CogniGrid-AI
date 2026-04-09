from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    neo4j_uri: str      = "bolt://neo4j:7687"
    neo4j_user: str     = "neo4j"
    neo4j_password: str = "cognigrid123"

    qdrant_url: str        = "http://qdrant:6333"
    qdrant_collection: str = "cognigrid_documents"

    embedding_model: str = "all-MiniLM-L6-v2"
    redis_url: str       = "redis://redis:6379/0"


settings = Settings()
