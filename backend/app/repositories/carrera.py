"""Acceso a datos de Carrera. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.carrera import Carrera
from app.models.usuario_carrera import usuario_carrera


def get_by_id(db: Session, carrera_id: int) -> Carrera | None:
    return db.get(Carrera, carrera_id)


def get_by_clave(db: Session, clave: str) -> Carrera | None:
    return db.execute(select(Carrera).where(Carrera.clave == clave)).scalar_one_or_none()


def list_all(db: Session, *, solo_activas: bool = False) -> list[Carrera]:
    stmt = select(Carrera)
    if solo_activas:
        stmt = stmt.where(Carrera.activa.is_(True))
    return list(db.execute(stmt.order_by(Carrera.nombre)).scalars())


def list_for_usuario(db: Session, usuario_id: int) -> list[Carrera]:
    stmt = (
        select(Carrera)
        .join(usuario_carrera, usuario_carrera.c.carrera_id == Carrera.id)
        .where(usuario_carrera.c.usuario_id == usuario_id)
        .order_by(Carrera.nombre)
    )
    return list(db.execute(stmt).scalars())


def usuario_tiene_asignacion(db: Session, usuario_id: int, carrera_id: int) -> bool:
    stmt = select(usuario_carrera.c.usuario_id).where(
        usuario_carrera.c.usuario_id == usuario_id,
        usuario_carrera.c.carrera_id == carrera_id,
    )
    return db.execute(stmt).first() is not None


def add(db: Session, carrera: Carrera) -> Carrera:
    db.add(carrera)
    db.flush()
    return carrera
