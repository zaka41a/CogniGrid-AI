from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Neo4j
    neo4j_uri: str = "bolt://cg-neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "cg_neo4j_2024"

    # Service info
    service_name: str = "graph-service"
    log_level: str = "INFO"


settings = Settings()
