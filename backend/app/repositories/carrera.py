"""Acceso a datos de Carrera. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.carrera import Carrera


def get_by_id(db: Session, carrera_id: int) -> Carrera | None:
    return db.get(Carrera, carrera_id)


def get_by_clave(db: Session, clave: str) -> Carrera | None:
    return db.execute(select(Carrera).where(Carrera.clave == clave)).scalar_one_or_none()


def list_all(db: Session, *, solo_activas: bool = False) -> list[Carrera]:
    stmt = select(Carrera)
    if solo_activas:
        stmt = stmt.where(Carrera.activa.is_(True))
    return list(db.execute(stmt.order_by(Carrera.nombre)).scalars())


def add(db: Session, carrera: Carrera) -> Carrera:
    db.add(carrera)
    db.flush()
    return carrera
