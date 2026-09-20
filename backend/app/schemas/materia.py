"""Schemas de Materia. `creditos` es siempre read-only (lo calcula la DB);
MateriaMutationResponse adjunta las violaciones WARNING no bloqueantes."""
from __future__ import annotations

from datetime import datetime

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AreaFormacion, ModalidadPrograma, TipoAula, TipoMateria


def _validar_nombre_oracion(nombre: str) -> str:
    nombre = " ".join(nombre.split())
    letras = [c for c in nombre if c.isalpha()]
    if not letras or not letras[0].isupper():
        raise ValueError("el nombre debe iniciar con mayúscula")
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", nombre)
    # Admite siglas y números romanos, pero rechaza el Title Case evidente.
    mayusculas_indebidas = [
        p for p in palabras[1:] if p[0].isupper() and not p.isupper() and p not in {"I", "II", "III", "IV", "V"}
    ]
    if len(mayusculas_indebidas) >= 2:
        raise ValueError("el nombre debe escribirse en formato oración")
    return nombre


class MateriaBase(BaseModel):
    clave: str = Field(min_length=1, max_length=20)
    nombre: str
    horas_docente: int = Field(ge=0)
    horas_independientes: int = Field(ge=0)
    instalaciones: str | None = None
    tipo_aula: TipoAula | None = None
    modalidad: ModalidadPrograma | None = None
    area_formacion: AreaFormacion | None = None
    aporte_sustancial: bool = False
    docente_sugerido: str | None = Field(default=None, max_length=200)
    programa_asignatura: str | None = None
    usa_numeracion_romana: bool = False
    es_capstone: bool = False
    es_practica_profesional: bool = False
    es_topico_selecto: bool = False
    excepcion_horas_estandar: bool = False
    ciclos_disponibles: list[int] = Field(default_factory=list)
    tipo: TipoMateria
    seriacion_materia_id: int | None = None
    activa: bool = True

    @field_validator("nombre")
    @classmethod
    def nombre_en_formato_oracion(cls, value: str) -> str:
        return _validar_nombre_oracion(value)

    @field_validator("instalaciones")
    @classmethod
    def instalacion_catalogada(cls, value: str | None) -> str | None:
        if value is not None and value.upper() not in {"A", "L", "O"}:
            raise ValueError("instalaciones solo admite A, L u O; usa tipo_aula")
        return value.upper() if value else value

    @field_validator("ciclos_disponibles")
    @classmethod
    def ciclos_validos(cls, value: list[int]) -> list[int]:
        if any(c < 1 or c > 20 for c in value):
            raise ValueError("los ciclos disponibles deben estar entre 1 y 20")
        return sorted(set(value))


class MateriaCreate(MateriaBase):
    pass


class MateriaUpdate(BaseModel):
    clave: str | None = Field(default=None, min_length=1, max_length=20)
    nombre: str | None = None
    horas_docente: int | None = Field(default=None, ge=0)
    horas_independientes: int | None = Field(default=None, ge=0)
    instalaciones: str | None = None
    tipo_aula: TipoAula | None = None
    modalidad: ModalidadPrograma | None = None
    area_formacion: AreaFormacion | None = None
    aporte_sustancial: bool | None = None
    docente_sugerido: str | None = Field(default=None, max_length=200)
    programa_asignatura: str | None = None
    usa_numeracion_romana: bool | None = None
    es_capstone: bool | None = None
    es_practica_profesional: bool | None = None
    es_topico_selecto: bool | None = None
    excepcion_horas_estandar: bool | None = None
    ciclos_disponibles: list[int] | None = None
    tipo: TipoMateria | None = None
    seriacion_materia_id: int | None = None
    activa: bool | None = None

    @field_validator("nombre")
    @classmethod
    def nombre_en_formato_oracion(cls, value: str | None) -> str | None:
        return _validar_nombre_oracion(value) if value is not None else None

    @field_validator("instalaciones")
    @classmethod
    def instalacion_catalogada(cls, value: str | None) -> str | None:
        if value is not None and value.upper() not in {"A", "L", "O"}:
            raise ValueError("instalaciones solo admite A, L u O; usa tipo_aula")
        return value.upper() if value else value

    @field_validator("ciclos_disponibles")
    @classmethod
    def ciclos_validos(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and any(c < 1 or c > 20 for c in value):
            raise ValueError("los ciclos disponibles deben estar entre 1 y 20")
        return sorted(set(value)) if value is not None else None


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
    tipo_aula: TipoAula | None
    modalidad: ModalidadPrograma | None
    area_formacion: AreaFormacion | None
    aporte_sustancial: bool
    docente_sugerido: str | None
    programa_asignatura: str | None
    usa_numeracion_romana: bool
    es_capstone: bool
    es_practica_profesional: bool
    es_topico_selecto: bool
    excepcion_horas_estandar: bool
    ciclos_disponibles: list[int]
    tipo: TipoMateria
    seriacion_materia_id: int | None
    activa: bool
    created_at: datetime
    updated_at: datetime


class MateriaMutationResponse(BaseModel):
    materia: MateriaRead
    warnings: list[dict] = Field(default_factory=list)


class OptativaInstitucionalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    orden: int
    activa: bool
