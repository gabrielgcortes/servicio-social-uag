"""Construye la vista agregada de un plan curricular:
carrera + plan + semestres + elementos + totales + violaciones.
Reutiliza rules.context.build_context para no duplicar queries."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.enums import TipoElemento
from app.repositories import plan_curricular as plan_repo
from app.rules.context import build_context
from app.rules.registry import crear_motor

_motor = crear_motor()


def get_mapa(db: Session, plan_id: int) -> dict:
    plan = plan_repo.get_by_id(db, plan_id)
    if plan is None:
        raise NotFoundError("Plan curricular no encontrado")

    ctx = build_context(db, plan_id, operacion="mapa")
    violaciones = _motor.evaluate(ctx)

    semestres_payload = []
    for semestre in ctx.semestres:
        elementos = ctx.elementos_por_semestre.get(semestre.id, [])
        total_creditos = 0.0
        total_hd = 0
        total_hi = 0
        for elemento in elementos:
            if elemento.tipo == TipoElemento.MATERIA:
                materia = ctx.materias_por_id.get(elemento.materia_id)
                if materia is not None:
                    total_creditos += float(materia.creditos or 0)
                    total_hd += materia.horas_docente
                    total_hi += materia.horas_independientes
            else:
                total_creditos += float(elemento.creditos or 0)
                total_hd += elemento.horas_docente or 0
                total_hi += elemento.horas_independientes or 0

        semestres_payload.append(
            {
                "id": semestre.id,
                "numero": semestre.numero,
                "elementos": elementos,
                "totales": {
                    "total_creditos": total_creditos,
                    "total_horas_docente": total_hd,
                    "total_horas_independientes": total_hi,
                    "num_elementos": len(elementos),
                },
            }
        )

    return {
        "carrera": ctx.carrera,
        "plan": plan,
        "semestres": semestres_payload,
        "violations": [v.to_dict() for v in violaciones],
    }
