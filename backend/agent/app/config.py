from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    default_llm_provider: str = "ollama"
    default_llm_model: str    = "llama3"
    ollama_base_url: str      = "http://ollama:11434"
    openai_api_key: str       = ""
    anthropic_api_key: str    = ""

    # Services
    graph_service_url: str      = "http://graph:8002"
    rag_service_url: str        = "http://graphrag:8004"
    ai_engine_url: str          = "http://ai-engine:8003"
    ingestion_service_url: str  = "http://ingestion:8001"

    # Redis (conversation memory)
    redis_url: str = "redis://redis:6379/1"


settings = Settings()
