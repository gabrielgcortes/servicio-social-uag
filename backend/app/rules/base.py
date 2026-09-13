"""Contratos del motor de reglas: Rule, RuleContext, RuleViolation, Severity.
Las reglas son puras: reciben un RuleContext ya cargado y no tocan la DB."""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Protocol

from app.models.carrera import Carrera
from app.models.materia import Materia
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento


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
    """Snapshot en memoria de una carrera, ya cargado por rules/context.py
    antes de mutar/persistir nada, para que las reglas nunca golpeen la DB."""

    carrera: Carrera
    semestres: list[Semestre]
    elementos_por_semestre: dict[int, list[SemestreElemento]]
    materias_por_id: dict[int, Materia]
    operacion: str | None = None


class Rule(Protocol):
    code: str
    scope: RuleScope

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]: ...
