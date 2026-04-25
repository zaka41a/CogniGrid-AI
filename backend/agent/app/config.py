from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    default_llm_provider: str = "groq"
    default_llm_model: str    = "llama-3.3-70b-versatile"
    groq_api_key: str         = ""
    ollama_base_url: str      = "http://host.docker.internal:11434"
    openai_api_key: str       = ""
    anthropic_api_key: str    = ""

    # Services — use Docker container names (reachable from inside Docker network)
    graph_service_url: str      = "http://cg-graph:8002"
    rag_service_url: str        = "http://cg-graphrag:8004"
    ai_engine_url: str          = "http://cg-ai-engine:8003"
    ingestion_service_url: str  = "http://cg-ingestion:8001"

    # Redis (conversation memory)
    redis_url: str = "redis://cg-redis:6379/1"


settings = Settings()
