"""Reglas de créditos y horas (MAX_CREDITOS_SEMESTRE, CREDITOS_NO_ENTEROS,
HORAS_NO_NEGATIVAS)."""
from __future__ import annotations

from app.models.enums import TipoElemento
from app.models.semestre_elemento import SemestreElemento
from app.rules.base import RuleContext, RuleScope, RuleViolation, Severity
from app.services.creditos import creditos_son_enteros


class MaxCreditosSemestreRule:
    code = "MAX_CREDITOS_SEMESTRE"
    scope = RuleScope.SEMESTRE

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        maximo = float(ctx.configuracion.max_creditos_ciclo) if ctx.configuracion else ctx.plan.max_creditos_semestre
        for semestre in ctx.semestres:
            elementos = ctx.elementos_por_semestre.get(semestre.id, [])
            total = self._total_creditos(elementos, ctx)
            if total > maximo:
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.ERROR,
                        message=(
                            f"El semestre {semestre.numero} tiene {total} créditos, "
                            f"supera el máximo de {maximo}"
                        ),
                        context={
                            "semestre_id": semestre.id,
                            "semestre": semestre.numero,
                            "total": float(total),
                            "maximo": maximo,
                        },
                    )
                )
        return violaciones

    @staticmethod
    def _total_creditos(elementos: list[SemestreElemento], ctx: RuleContext) -> float:
        total = 0.0
        for elemento in elementos:
            if elemento.tipo == TipoElemento.MATERIA:
                materia = ctx.materias_por_id.get(elemento.materia_id)
                if materia is not None and materia.creditos is not None:
                    total += float(materia.creditos)
            elif elemento.creditos is not None:
                total += float(elemento.creditos)
        return total


class CreditosEnterosRule:
    code = "CREDITOS_NO_ENTEROS"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        for materia in ctx.materias_por_id.values():
            if not creditos_son_enteros(materia.horas_docente, materia.horas_independientes):
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.WARNING,
                        message=f"La materia {materia.clave} tiene créditos no enteros",
                        context={"materia_id": materia.id, "clave": materia.clave},
                    )
                )
        return violaciones


class HorasValidasRule:
    code = "HORAS_NO_NEGATIVAS"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        for materia in ctx.materias_por_id.values():
            if materia.horas_docente < 0 or materia.horas_independientes < 0:
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.ERROR,
                        message=f"La materia {materia.clave} tiene horas negativas",
                        context={"materia_id": materia.id, "clave": materia.clave},
                    )
                )
            elif materia.horas_docente == 0 and materia.horas_independientes == 0:
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.ERROR,
                        message=f"La materia {materia.clave} debe tener al menos una hora",
                        context={"materia_id": materia.id, "clave": materia.clave},
                    )
                )
        return violaciones
