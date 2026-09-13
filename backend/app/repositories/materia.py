"""Acceso a datos de Materia. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import TipoMateria
from app.models.materia import Materia


def get_by_id(db: Session, materia_id: int) -> Materia | None:
    return db.get(Materia, materia_id)


def get_by_carrera_clave(db: Session, carrera_id: int, clave: str) -> Materia | None:
    stmt = select(Materia).where(Materia.carrera_id == carrera_id, Materia.clave == clave)
    return db.execute(stmt).scalar_one_or_none()


def list_by_carrera(
    db: Session, carrera_id: int, *, tipo: TipoMateria | None = None
) -> list[Materia]:
    stmt = select(Materia).where(Materia.carrera_id == carrera_id)
    if tipo is not None:
        stmt = stmt.where(Materia.tipo == tipo)
    return list(db.execute(stmt.order_by(Materia.clave)).scalars())


def add(db: Session, materia: Materia) -> Materia:
    db.add(materia)
    db.flush()
    return materia


def delete(db: Session, materia: Materia) -> None:
    db.delete(materia)
