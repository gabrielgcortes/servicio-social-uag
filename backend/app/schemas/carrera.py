"""Schemas Pydantic de Carrera. Los campos restringidos a ADMIN (clave y
activa) se validan en services/carrera.py según el rol
del actor, no con esquemas separados por rol (evita ambigüedad de Union body)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CarreraCreate(BaseModel):
    clave: str = Field(min_length=1, max_length=20)
    nombre: str
    descripcion: str | None = None


class CarreraUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    clave: str | None = Field(default=None, min_length=1, max_length=20)
    activa: bool | None = None


class CarreraRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clave: str
    nombre: str
    descripcion: str | None
    activa: bool
    created_at: datetime
    updated_at: datetime
