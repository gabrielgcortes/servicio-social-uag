"""Contratos HTTP de planes curriculares y su duplicación."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import EstadoPlanCurricular


class PlanCurricularCreate(BaseModel):
    clave: str = Field(min_length=1, max_length=40)
    descripcion: str | None = None
    anio_inicio: int | None = Field(default=None, ge=1900, le=3000)
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    estado: EstadoPlanCurricular = EstadoPlanCurricular.BORRADOR
    max_creditos_semestre: int = Field(default=50, gt=0)

    @model_validator(mode="after")
    def vigencia_valida(self) -> "PlanCurricularCreate":
        if self.vigente_desde and self.vigente_hasta and self.vigente_hasta < self.vigente_desde:
            raise ValueError("vigente_hasta no puede ser anterior a vigente_desde")
        return self


class PlanCurricularUpdate(BaseModel):
    clave: str | None = Field(default=None, min_length=1, max_length=40)
    descripcion: str | None = None
    anio_inicio: int | None = Field(default=None, ge=1900, le=3000)
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    estado: EstadoPlanCurricular | None = None
    max_creditos_semestre: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def vigencia_valida(self) -> "PlanCurricularUpdate":
        if self.vigente_desde and self.vigente_hasta and self.vigente_hasta < self.vigente_desde:
            raise ValueError("vigente_hasta no puede ser anterior a vigente_desde")
        return self


class PlanDuplicarRequest(BaseModel):
    clave: str = Field(min_length=1, max_length=40)
    descripcion: str | None = None
    anio_inicio: int | None = Field(default=None, ge=1900, le=3000)
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    estado: EstadoPlanCurricular = EstadoPlanCurricular.BORRADOR

    @model_validator(mode="after")
    def vigencia_valida(self) -> "PlanDuplicarRequest":
        if self.vigente_desde and self.vigente_hasta and self.vigente_hasta < self.vigente_desde:
            raise ValueError("vigente_hasta no puede ser anterior a vigente_desde")
        return self


class PlanCurricularRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    carrera_id: int
    clave: str
    descripcion: str | None
    anio_inicio: int | None
    vigente_desde: date | None
    vigente_hasta: date | None
    estado: EstadoPlanCurricular
    max_creditos_semestre: int
    created_at: datetime
    updated_at: datetime
