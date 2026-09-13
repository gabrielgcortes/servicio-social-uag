"""Acceso a datos de SemestreElemento. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.semestre_elemento import SemestreElemento


def get_by_id(db: Session, elemento_id: int) -> SemestreElemento | None:
    return db.get(SemestreElemento, elemento_id)


def list_by_semestre(db: Session, semestre_id: int) -> list[SemestreElemento]:
    stmt = (
        select(SemestreElemento)
        .where(SemestreElemento.semestre_id == semestre_id)
        .order_by(SemestreElemento.orden)
    )
    return list(db.execute(stmt).scalars())


def get_by_materia(db: Session, materia_id: int) -> SemestreElemento | None:
    stmt = select(SemestreElemento).where(SemestreElemento.materia_id == materia_id)
    return db.execute(stmt).scalar_one_or_none()


def siguiente_orden(db: Session, semestre_id: int) -> int:
    maximo = db.execute(
        select(func.max(SemestreElemento.orden)).where(
            SemestreElemento.semestre_id == semestre_id
        )
    ).scalar_one()
    return 0 if maximo is None else maximo + 1


def add(db: Session, elemento: SemestreElemento) -> SemestreElemento:
    db.add(elemento)
    db.flush()
    return elemento


def delete(db: Session, elemento: SemestreElemento) -> None:
    db.delete(elemento)
