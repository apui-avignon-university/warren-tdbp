"""Warren TdBP settings."""

from pydantic import BaseSettings
import io


class Settings(BaseSettings):
    """Warren's TdBP global environment and configuration settings."""

    DEBUG: bool = False

    # Sliding window
    SLIDING_WINDOW_SIZE_MIN: int = 15
    ACTIVE_ACTIONS_MIN: int = 6
    DYNAMIC_COHORT_MIN: int = 3

    class Config:
        """Pydantic Configuration."""

        case_sensitive = True
        env_file = ".env"
        env_file_encoding = getattr(io, "LOCALE_ENCODING", "utf8")
        env_nested_delimiter = "__"
        env_prefix = "WARREN_"


settings = Settings()
