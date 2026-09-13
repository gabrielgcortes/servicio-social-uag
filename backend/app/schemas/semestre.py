"""Schemas Pydantic de Semestre."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SemestreCreate(BaseModel):
    numero: int | None = Field(
        default=None,
        ge=1,
        le=20,
        description="Si se omite, se asigna el siguiente número libre de la carrera",
    )


class SemestreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    carrera_id: int
    numero: int
    created_at: datetime
    updated_at: datetime
