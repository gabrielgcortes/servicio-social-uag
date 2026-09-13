"""Schema agregado del mapa curricular completo de una carrera: una sola
respuesta con semestres, elementos (con materia embebida), totales por
semestre y las violaciones vigentes."""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.carrera import CarreraRead
from app.schemas.elemento import ElementoRead


class SemestreTotales(BaseModel):
    total_creditos: float
    total_horas_docente: int
    total_horas_independientes: int
    num_elementos: int


class SemestreMapa(BaseModel):
    id: int
    numero: int
    elementos: list[ElementoRead]
    totales: SemestreTotales


class MapaCurricular(BaseModel):
    carrera: CarreraRead
    semestres: list[SemestreMapa]
    violations: list[dict] = Field(default_factory=list)
