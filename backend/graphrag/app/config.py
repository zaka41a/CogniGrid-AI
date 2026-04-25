from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Neo4j
    neo4j_uri: str      = "bolt://cg-neo4j:7687"
    neo4j_user: str     = "neo4j"
    neo4j_password: str = "cg_neo4j_2024"

    # Qdrant
    qdrant_url: str         = "http://cg-qdrant:6333"
    qdrant_collection: str  = "cognigrid_documents"

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"

    # LLM
    default_llm_provider: str = "groq"         # groq | openai | anthropic | ollama
    default_llm_model: str    = "llama-3.3-70b-versatile"
    groq_api_key: str         = ""
    ollama_base_url: str      = "http://host.docker.internal:11434"
    openai_api_key: str       = ""
    anthropic_api_key: str    = ""

    # Redis
    redis_url: str = "redis://cg-redis:6379/0"

    # RAG params
    top_k: int                  = 5
    graph_context_hops: int     = 2
    max_context_tokens: int     = 4000


settings = Settings()
