"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Always load .env from project root (parent of app/), regardless of cwd
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env", override=True)


class Settings:
    """Application settings from environment."""

    # DeepSeek LLM
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_API_KEY_BACKUP: str = os.getenv("DEEPSEEK_API_KEY_BACKUP", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Workspace
    WORKSPACE_DIR: Path = Path(os.getenv("WORKSPACE_DIR", "./workspace"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./novel2script.db")

    # Pipeline limits
    MIN_CHAPTERS: int = 3
    MAX_CHAPTERS: int = 50
    MAX_CHAPTER_CHARS: int = 10000
    MAX_FILE_SIZE_MB: int = 5
    LLM_CONCURRENCY: int = 2
    SUMMARY_MAX_CHARS: int = 100

    # Retry
    MAX_LLM_RETRIES: int = 3
    MAX_PYDANTIC_RETRIES: int = 1


settings = Settings()
