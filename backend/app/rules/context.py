"""Construye un RuleContext a partir de la DB con pocas queries (selectinload)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.carrera import Carrera
from app.models.materia import Materia
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.rules.base import RuleContext


def build_context(db: Session, carrera_id: int, *, operacion: str | None = None) -> RuleContext:
    carrera = db.get(Carrera, carrera_id)
    if carrera is None:
        raise ValueError(f"Carrera {carrera_id} no encontrada")

    semestres = list(
        db.execute(
            select(Semestre)
            .where(Semestre.carrera_id == carrera_id)
            .options(selectinload(Semestre.elementos).selectinload(SemestreElemento.materia))
            .order_by(Semestre.numero)
        ).scalars()
    )
    materias = list(
        db.execute(select(Materia).where(Materia.carrera_id == carrera_id)).scalars()
    )

    return RuleContext(
        carrera=carrera,
        semestres=semestres,
        elementos_por_semestre={s.id: s.elementos for s in semestres},
        materias_por_id={m.id: m for m in materias},
        operacion=operacion,
    )
