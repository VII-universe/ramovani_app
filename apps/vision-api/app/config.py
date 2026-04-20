from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8001
    static_dir: str = "/tmp/ramovani-static"
    max_upload_mb: int = 10
    min_contour_area: int = 5000
    confidence_warn_threshold: float = 0.5
    confidence_reject_threshold: float = 0.2
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


settings = Settings()
