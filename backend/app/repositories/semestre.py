"""Acceso a datos de Semestre. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.semestre import Semestre


def get_by_id(db: Session, semestre_id: int) -> Semestre | None:
    return db.get(Semestre, semestre_id)


def list_by_carrera(db: Session, carrera_id: int) -> list[Semestre]:
    stmt = select(Semestre).where(Semestre.carrera_id == carrera_id).order_by(Semestre.numero)
    return list(db.execute(stmt).scalars())


def get_by_carrera_numero(db: Session, carrera_id: int, numero: int) -> Semestre | None:
    stmt = select(Semestre).where(
        Semestre.carrera_id == carrera_id, Semestre.numero == numero
    )
    return db.execute(stmt).scalar_one_or_none()


def siguiente_numero_libre(db: Session, carrera_id: int) -> int:
    maximo = db.execute(
        select(func.max(Semestre.numero)).where(Semestre.carrera_id == carrera_id)
    ).scalar_one()
    return (maximo or 0) + 1


def add(db: Session, semestre: Semestre) -> Semestre:
    db.add(semestre)
    db.flush()
    return semestre


def delete(db: Session, semestre: Semestre) -> None:
    db.delete(semestre)
