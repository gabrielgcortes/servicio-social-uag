"""Reglas de seriación: misma carrera, sin ciclos, en un semestre anterior."""
from __future__ import annotations

from app.models.enums import TipoElemento
from app.rules.base import RuleContext, RuleScope, RuleViolation, Severity


class SeriacionMismaCarreraRule:
    code = "SERIACION_MISMA_CARRERA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        for materia in ctx.materias_por_id.values():
            if materia.seriacion_materia_id is None:
                continue
            if ctx.materias_por_id.get(materia.seriacion_materia_id) is None:
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.ERROR,
                        message=f"El prerrequisito de {materia.clave} no pertenece a esta carrera",
                        context={"materia_id": materia.id, "clave": materia.clave},
                    )
                )
        return violaciones


class SeriacionCicloRule:
    code = "SERIACION_CICLO"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        violaciones: list[RuleViolation] = []
        for materia in ctx.materias_por_id.values():
            visitados: set[int] = set()
            actual = materia
            while actual is not None and actual.seriacion_materia_id is not None:
                siguiente_id = actual.seriacion_materia_id
                if siguiente_id == materia.id or siguiente_id in visitados:
                    violaciones.append(
                        RuleViolation(
                            code=self.code,
                            severity=Severity.ERROR,
                            message=f"Ciclo de seriación detectado a partir de {materia.clave}",
                            context={"materia_id": materia.id, "clave": materia.clave},
                        )
                    )
                    break
                visitados.add(actual.id)
                actual = ctx.materias_por_id.get(siguiente_id)
        return violaciones


class SeriacionOrdenSemestreRule:
    code = "SERIACION_ORDEN_SEMESTRE"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        semestre_por_materia = self._semestre_por_materia(ctx)
        violaciones: list[RuleViolation] = []
        for materia in ctx.materias_por_id.values():
            if materia.seriacion_materia_id is None:
                continue
            numero_actual = semestre_por_materia.get(materia.id)
            numero_prereq = semestre_por_materia.get(materia.seriacion_materia_id)
            if numero_actual is None or numero_prereq is None:
                continue  # alguna de las dos materias no está colocada en el mapa aún
            if numero_prereq >= numero_actual:
                violaciones.append(
                    RuleViolation(
                        code=self.code,
                        severity=Severity.ERROR,
                        message=(
                            f"El prerrequisito de {materia.clave} debe estar en un "
                            "semestre anterior"
                        ),
                        context={"materia_id": materia.id, "clave": materia.clave},
                    )
                )
        return violaciones

    @staticmethod
    def _semestre_por_materia(ctx: RuleContext) -> dict[int, int]:
        numero_por_semestre_id = {s.id: s.numero for s in ctx.semestres}
        resultado: dict[int, int] = {}
        for semestre_id, elementos in ctx.elementos_por_semestre.items():
            for elemento in elementos:
                if elemento.tipo == TipoElemento.MATERIA and elemento.materia_id is not None:
                    resultado[elemento.materia_id] = numero_por_semestre_id[semestre_id]
        return resultado
