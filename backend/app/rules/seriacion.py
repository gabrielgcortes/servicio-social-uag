"""Reglas de seriación: mismo plan, sin ciclos y en un semestre anterior."""
from __future__ import annotations

import re
import unicodedata

from app.models.enums import TipoElemento
from app.rules.base import RuleContext, RuleScope, RuleViolation, Severity


class SeriacionMismoPlanRule:
    code = "SERIACION_MISMO_PLAN"
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
                        message=f"El prerrequisito de {materia.clave} no pertenece a este plan",
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


class SeriacionPermitidaRule:
    code = "SERIACION_PROHIBIDA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        if not ctx.configuracion or not ctx.configuracion.prohibir_seriacion:
            return []
        return [
            RuleViolation(self.code, Severity.ERROR, "La configuración flexible del plan prohíbe seriaciones", {"materia_id": m.id})
            for m in ctx.materias_por_id.values()
            if m.seriacion_materia_id is not None
        ]


class SeriacionRomanaRule:
    code = "SERIACION_NUMERACION_ROMANA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        return [
            RuleViolation(self.code, Severity.WARNING, f"{m.clave} debe marcarse con numeración romana para usar seriación", {"materia_id": m.id})
            for m in ctx.materias_por_id.values()
            if m.seriacion_materia_id is not None and not m.usa_numeracion_romana
        ]


def _normalizar_nombre(nombre: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", nombre.lower()) if unicodedata.category(c) != "Mn").strip()


class SecuenciasDocumentalesRule:
    code = "SECUENCIA_DOCUMENTAL"
    scope = RuleScope.MATERIA

    _secuencias = (
        (re.compile(r"^lengua extranjera (ii|2)$"), {"lengua extranjera i", "lengua extranjera 1"}),
        (re.compile(r"^practicas profesionales (ii|2)$"), {"practicas profesionales i", "practicas profesionales 1"}),
    )

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        result = []
        for materia in ctx.materias_por_id.values():
            nombre = _normalizar_nombre(materia.nombre)
            for patron, prerequisitos_validos in self._secuencias:
                if not patron.match(nombre):
                    continue
                prereq = ctx.materias_por_id.get(materia.seriacion_materia_id)
                if prereq is None or _normalizar_nombre(prereq.nombre) not in prerequisitos_validos:
                    result.append(RuleViolation(self.code, Severity.ERROR, f"{materia.nombre} debe tener seriación con su asignatura I", {"materia_id": materia.id}))
        return result
