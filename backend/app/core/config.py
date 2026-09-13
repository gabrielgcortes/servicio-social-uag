"""Punto único de configuración: todo se lee desde variables de entorno / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL
    database_url: str = "postgresql+psycopg://mapa_user:change_me@localhost:5432/mapa_curricular"

    # Seguridad / JWT
    secret_key: str = "change_me_to_a_long_random_value"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    jwt_algorithm: str = "HS256"

    # Seed inicial
    seed_admin_email: str = "admin@universidad.edu"
    seed_admin_password: str = "ChangeMe123"

    # CORS: lista separada por comas en la variable de entorno
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
