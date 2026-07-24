import json
from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Render mounts Secret Files at /app/.env (WORKDIR).
        # Locally, .env sits in the backend/ directory.
        # pydantic-settings tries each path in order and uses the first found.
        env_file=["/app/.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # ignore unknown keys in .env
    )
    APP_NAME: str = "EcoVision AI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    DATABASE_URL: str = "postgresql://ecovision:ecovision_dev@localhost:5432/ecovision"
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "mistralai/mistral-7b-instruct"  # any model on openrouter.ai
    WATSONX_API_KEY: str = ""
    WATSONX_PROJECT_ID: str = ""
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    GRANITE_MODEL_ID: str = "ibm/granite-13b-instruct-v2"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION: str = "ecovision_docs"
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL_SECONDS: int = 3600
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]
    MAX_UPLOAD_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    REPORTS_DIR: str = "reports"
    ALLOWED_MIME_TYPES: Union[List[str], str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ]
    CHAT_RATE_LIMIT: str = "20/minute"
    LOGIN_RATE_LIMIT: str = "10/minute"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    SENTRY_DSN: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@ecovision.ai"
    ENABLE_AUDIT_LOG: bool = True

    @field_validator("ALLOWED_ORIGINS", "ALLOWED_MIME_TYPES", mode="before")
    @classmethod
    def parse_list_or_str(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
