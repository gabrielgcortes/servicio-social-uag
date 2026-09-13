"""Schemas de SemestreElemento: unión discriminada por `tipo` para el alta."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TipoElemento
from app.schemas.materia import MateriaRead


class ElementoMateriaCreate(BaseModel):
    tipo: Literal[TipoElemento.MATERIA] = TipoElemento.MATERIA
    materia_id: int


class ElementoEspacioOptativoCreate(BaseModel):
    tipo: Literal[TipoElemento.ESPACIO_OPTATIVO] = TipoElemento.ESPACIO_OPTATIVO
    nombre: str
    horas_docente: int = Field(ge=0)
    horas_independientes: int = Field(ge=0)


ElementoCreate = Annotated[
    Union[ElementoMateriaCreate, ElementoEspacioOptativoCreate],
    Field(discriminator="tipo"),
]


class EspacioOptativoUpdate(BaseModel):
    nombre: str | None = None
    horas_docente: int | None = Field(default=None, ge=0)
    horas_independientes: int | None = Field(default=None, ge=0)


class ElementoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    semestre_id: int
    tipo: TipoElemento
    orden: int
    materia_id: int | None
    materia: MateriaRead | None = None
    nombre: str | None
    horas_docente: int | None
    horas_independientes: int | None
    creditos: float | None
    created_at: datetime
    updated_at: datetime


class ElementoMutationResponse(BaseModel):
    elemento: ElementoRead
    warnings: list[dict] = Field(default_factory=list)


class ReordenarRequest(BaseModel):
    elemento_ids: list[int]


class MoverElementoRequest(BaseModel):
    semestre_destino_id: int
    posicion: int = Field(ge=0)
