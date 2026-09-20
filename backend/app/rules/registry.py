"""Registro central de reglas activas. Agregar una regla nueva = crear la
clase en su módulo + añadirla a REGLAS_ACTIVAS. Cero `if` dispersos en services/."""
from __future__ import annotations

from app.rules.base import Rule
from app.rules.creditos import CreditosEnterosRule, HorasValidasRule, MaxCreditosSemestreRule
from app.rules.engine import RuleEngine
from app.rules.seriacion import (
    SeriacionCicloRule,
    SeriacionMismoPlanRule,
    SeriacionOrdenSemestreRule,
    SeriacionPermitidaRule,
    SeriacionRomanaRule,
    SecuenciasDocumentalesRule,
)
from app.rules.academicas import (
    AreaFormacionRule,
    ClaveMateriaRule,
    EstandarMaestriaRule,
    EspaciosOptativosMinimosRule,
    HorasFrecuenciaRule,
    LimitesPlanRule,
    MateriasRequeridasRule,
    MaxMateriasCicloRule,
    OptativasMinimosRule,
    PracticasCapstoneRule,
)

REGLAS_ACTIVAS: list[Rule] = [
    MaxCreditosSemestreRule(),
    CreditosEnterosRule(),
    HorasValidasRule(),
    SeriacionMismoPlanRule(),
    SeriacionCicloRule(),
    SeriacionOrdenSemestreRule(),
    SeriacionPermitidaRule(),
    SeriacionRomanaRule(),
    SecuenciasDocumentalesRule(),
    MaxMateriasCicloRule(),
    LimitesPlanRule(),
    HorasFrecuenciaRule(),
    AreaFormacionRule(),
    OptativasMinimosRule(),
    EspaciosOptativosMinimosRule(),
    PracticasCapstoneRule(),
    MateriasRequeridasRule(),
    EstandarMaestriaRule(),
    ClaveMateriaRule(),
]

def crear_motor() -> RuleEngine:
    return RuleEngine(REGLAS_ACTIVAS)
