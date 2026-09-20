"""Schemas de Materia. `creditos` es siempre read-only (lo calcula la DB);
MateriaMutationResponse adjunta las violaciones WARNING no bloqueantes."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TipoMateria


class MateriaBase(BaseModel):
    clave: str = Field(min_length=1, max_length=20)
    nombre: str
    horas_docente: int = Field(ge=0)
    horas_independientes: int = Field(ge=0)
    instalaciones: str | None = None
    modalidad: str | None = None
    tipo: TipoMateria
    seriacion_materia_id: int | None = None
    activa: bool = True


class MateriaCreate(MateriaBase):
    pass


class MateriaUpdate(BaseModel):
    clave: str | None = Field(default=None, min_length=1, max_length=20)
    nombre: str | None = None
    horas_docente: int | None = Field(default=None, ge=0)
    horas_independientes: int | None = Field(default=None, ge=0)
    instalaciones: str | None = None
    modalidad: str | None = None
    tipo: TipoMateria | None = None
    seriacion_materia_id: int | None = None
    activa: bool | None = None


class MateriaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_curricular_id: int
    clave: str
    nombre: str
    horas_docente: int
    horas_independientes: int
    creditos: float
    instalaciones: str | None
    modalidad: str | None
    tipo: TipoMateria
    seriacion_materia_id: int | None
    activa: bool
    created_at: datetime
    updated_at: datetime


class MateriaMutationResponse(BaseModel):
    materia: MateriaRead
    warnings: list[dict] = Field(default_factory=list)
