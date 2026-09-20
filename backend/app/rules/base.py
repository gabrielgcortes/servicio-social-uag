"""Contratos del motor de reglas: Rule, RuleContext, RuleViolation, Severity.
Las reglas son puras: reciben un RuleContext ya cargado y no tocan la DB."""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Protocol

from app.models.carrera import Carrera
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.models.configuracion_reglas import ConfiguracionReglasPlan
from app.models.autorizacion_excepcion import AutorizacionExcepcion


class Severity(str, enum.Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"


class RuleScope(str, enum.Enum):
    CARRERA = "CARRERA"
    SEMESTRE = "SEMESTRE"
    MATERIA = "MATERIA"


@dataclass(frozen=True)
class RuleViolation:
    code: str
    severity: Severity
    message: str
    context: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "severity": self.severity.value,
            "message": self.message,
            "context": self.context,
        }


@dataclass
class RuleContext:
    """Snapshot en memoria de un plan, ya cargado por rules/context.py
    antes de mutar/persistir nada, para que las reglas nunca golpeen la DB."""

    carrera: Carrera
    plan: PlanCurricular
    semestres: list[Semestre]
    elementos_por_semestre: dict[int, list[SemestreElemento]]
    materias_por_id: dict[int, Materia]
    operacion: str | None = None
    configuracion: ConfiguracionReglasPlan | None = None
    autorizaciones: list[AutorizacionExcepcion] = field(default_factory=list)


class Rule(Protocol):
    code: str
    scope: RuleScope

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]: ...
