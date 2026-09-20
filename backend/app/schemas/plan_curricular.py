"""Contratos HTTP de planes curriculares y su duplicación."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Decanato, EstadoPlanCurricular, ModalidadPrograma, NivelAcademico, TipoReconocimiento


class PlanCurricularCreate(BaseModel):
    clave: str = Field(min_length=1, max_length=40)
    descripcion: str | None = None
    anio_inicio: int | None = Field(default=None, ge=1900, le=3000)
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    estado: EstadoPlanCurricular = EstadoPlanCurricular.BORRADOR
    max_creditos_semestre: int = Field(default=50, gt=0)
    nivel_academico: NivelAcademico = NivelAcademico.LICENCIATURA
    modalidad: ModalidadPrograma = ModalidadPrograma.ESCOLARIZADA
    decanato: Decanato = Decanato.OTRO
    decanato_otro: str | None = Field(default=None, max_length=150)
    tipo_reconocimiento: TipoReconocimiento = TipoReconocimiento.FEDERAL
    mnemonico: str = Field(default="PLAN", min_length=2, max_length=12, pattern=r"^[A-Z][A-Z0-9]*$")
    texto_administrativo_flexible: str | None = None

    @model_validator(mode="after")
    def vigencia_valida(self) -> "PlanCurricularCreate":
        if self.vigente_desde and self.vigente_hasta and self.vigente_hasta < self.vigente_desde:
            raise ValueError("vigente_hasta no puede ser anterior a vigente_desde")
        if self.decanato == Decanato.OTRO and not self.decanato_otro:
            self.decanato_otro = "No especificado"
        if self.decanato != Decanato.OTRO and self.decanato_otro:
            raise ValueError("decanato_otro solo aplica al decanato OTRO")
        return self


class PlanCurricularUpdate(BaseModel):
    clave: str | None = Field(default=None, min_length=1, max_length=40)
    descripcion: str | None = None
    anio_inicio: int | None = Field(default=None, ge=1900, le=3000)
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    estado: EstadoPlanCurricular | None = None
    max_creditos_semestre: int | None = Field(default=None, gt=0)
    nivel_academico: NivelAcademico | None = None
    modalidad: ModalidadPrograma | None = None
    decanato: Decanato | None = None
    decanato_otro: str | None = Field(default=None, max_length=150)
    tipo_reconocimiento: TipoReconocimiento | None = None
    mnemonico: str | None = Field(default=None, min_length=2, max_length=12, pattern=r"^[A-Z][A-Z0-9]*$")
    texto_administrativo_flexible: str | None = None

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
    nivel_academico: NivelAcademico
    modalidad: ModalidadPrograma
    decanato: Decanato
    decanato_otro: str | None
    tipo_reconocimiento: TipoReconocimiento
    mnemonico: str
    texto_administrativo_flexible: str | None
    created_at: datetime
    updated_at: datetime


class ConfiguracionReglasCreate(BaseModel):
    duracion_ciclo_semanas: int | None = Field(default=None, gt=0)
    ciclos_esperados: int | None = Field(default=None, gt=0, le=20)
    max_creditos_ciclo: float | None = Field(default=None, gt=0)
    max_materias_ciclo: int | None = Field(default=None, gt=0)
    min_creditos_plan: float | None = Field(default=None, ge=0)
    max_creditos_plan: float | None = Field(default=None, ge=0)
    min_horas_plan: int | None = Field(default=None, ge=0)
    multiplo_horas: int | None = Field(default=None, gt=0)
    materias_por_ciclo: int | None = Field(default=None, gt=0)
    prohibir_seriacion: bool | None = None
    optativa_min_horas_docente: int | None = Field(default=None, ge=0)
    optativa_min_horas_independientes: int | None = Field(default=None, ge=0)
    practicas_min_periodos: int | None = Field(default=None, ge=0)
    practicas_max_periodos: int | None = Field(default=None, ge=0)
    practicas_min_horas: int | None = Field(default=None, ge=0)
    practicas_max_horas: int | None = Field(default=None, ge=0)
    practicas_min_creditos: float | None = Field(default=None, ge=0)
    practicas_max_creditos: float | None = Field(default=None, ge=0)
    capstone_min: int | None = Field(default=None, ge=0)
    capstone_max: int | None = Field(default=None, ge=0)
    horas_docente_estandar: int | None = Field(default=None, ge=0)
    horas_independientes_estandar: int | None = Field(default=None, ge=0)
    creditos_estandar: float | None = Field(default=None, ge=0)
    reglas_adicionales: dict | None = None


class ConfiguracionReglasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_curricular_id: int
    version: int
    vigente: bool
    vigente_desde: datetime
    duracion_ciclo_semanas: int
    ciclos_esperados: int
    max_creditos_ciclo: float
    max_materias_ciclo: int | None
    min_creditos_plan: float | None
    max_creditos_plan: float | None
    min_horas_plan: int | None
    multiplo_horas: int
    materias_por_ciclo: int | None
    prohibir_seriacion: bool
    optativa_min_horas_docente: int | None
    optativa_min_horas_independientes: int | None
    practicas_min_periodos: int
    practicas_max_periodos: int
    practicas_min_horas: int
    practicas_max_horas: int
    practicas_min_creditos: float
    practicas_max_creditos: float
    capstone_min: int
    capstone_max: int
    horas_docente_estandar: int | None
    horas_independientes_estandar: int | None
    creditos_estandar: float | None
    reglas_adicionales: dict
    created_at: datetime
    updated_at: datetime
