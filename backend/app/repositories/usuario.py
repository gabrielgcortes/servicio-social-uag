"""Acceso a datos de Usuario. Sin reglas de negocio: eso vive en services/."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import RolUsuario
from app.models.usuario import Usuario


def get_by_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.execute(
        select(Usuario).where(Usuario.id == usuario_id).options(selectinload(Usuario.carreras))
    ).scalar_one_or_none()


def get_by_email(db: Session, email: str) -> Usuario | None:
    return db.execute(
        select(Usuario).where(Usuario.email == email).options(selectinload(Usuario.carreras))
    ).scalar_one_or_none()


def list_usuarios(
    db: Session,
    *,
    rol: RolUsuario | None = None,
    carrera_id: int | None = None,
    activo: bool | None = None,
) -> list[Usuario]:
    stmt = select(Usuario).options(selectinload(Usuario.carreras))
    if rol is not None:
        stmt = stmt.where(Usuario.rol == rol)
    if carrera_id is not None:
        stmt = stmt.where(Usuario.carreras.any(id=carrera_id))
    if activo is not None:
        stmt = stmt.where(Usuario.activo == activo)
    return list(db.execute(stmt.order_by(Usuario.nombre)).scalars())


def add(db: Session, usuario: Usuario) -> Usuario:
    db.add(usuario)
    db.flush()
    return usuario
