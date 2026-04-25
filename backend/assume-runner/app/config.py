from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    graph_service_url: str     = "http://cg-graph:8002"
    ingestion_service_url: str = "http://cg-ingestion:8001"
    runs_dir: str              = "/tmp/assume_runs"
    max_concurrent_runs: int   = 3


settings = Settings()
