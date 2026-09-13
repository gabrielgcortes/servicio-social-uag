"""RuleEngine: ejecuta las reglas registradas y agrega violaciones."""
from __future__ import annotations

from app.rules.base import Rule, RuleContext, RuleScope, RuleViolation, Severity


class RuleEngine:
    def __init__(self, rules: list[Rule]) -> None:
        self._rules = rules

    def evaluate(
        self, ctx: RuleContext, *, scope: RuleScope | None = None
    ) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        for rule in self._rules:
            if scope is not None and rule.scope != scope:
                continue
            violaciones.extend(rule.evaluate(ctx))
        return violaciones

    @staticmethod
    def solo_errores(violaciones: list[RuleViolation]) -> list[RuleViolation]:
        return [v for v in violaciones if v.severity == Severity.ERROR]
