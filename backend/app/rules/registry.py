"""Registro central de reglas activas. Agregar una regla nueva = crear la
clase en su módulo + añadirla a REGLAS_ACTIVAS. Cero `if` dispersos en services/."""
from __future__ import annotations

from app.rules.base import Rule
from app.rules.creditos import CreditosEnterosRule, HorasValidasRule, MaxCreditosSemestreRule
from app.rules.engine import RuleEngine
from app.rules.seriacion import (
    SeriacionCicloRule,
    SeriacionMismaCarreraRule,
    SeriacionOrdenSemestreRule,
)

REGLAS_ACTIVAS: list[Rule] = [
    MaxCreditosSemestreRule(),
    CreditosEnterosRule(),
    HorasValidasRule(),
    SeriacionMismaCarreraRule(),
    SeriacionCicloRule(),
    SeriacionOrdenSemestreRule(),
]

# Preparadas para fases futuras (no se registran hasta implementarse):
# MIN_CREDITOS_OPTATIVAS, MAX_MATERIAS_SEMESTRE, TOTAL_CREDITOS_CARRERA,
# RESIDENCIA_MINIMA, excepciones por materia.


def crear_motor() -> RuleEngine:
    return RuleEngine(REGLAS_ACTIVAS)
