"""Políticas de autorización por carrera y resolución de jerarquías para endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.enums import RolUsuario
from app.repositories import materia as materia_repo
from app.repositories import semestre as semestre_repo
from app.repositories import semestre_elemento as elemento_repo


def require_view_carrera(principal: Principal, carrera_id: int) -> None:
    if principal.rol == RolUsuario.ADMIN:
        return
    if principal.carrera_id != carrera_id:
        raise ForbiddenError("No tienes permiso para consultar información de esta carrera")


def require_edit_carrera(principal: Principal, carrera_id: int) -> None:
    if principal.rol == RolUsuario.ADMIN:
        return
    if principal.rol == RolUsuario.DIRECTOR and principal.carrera_id == carrera_id:
        return
    raise ForbiddenError("No tienes permiso para modificar esta carrera")


def resolve_carrera_from_materia(db: Session, materia_id: int) -> int:
    materia = materia_repo.get_by_id(db, materia_id)
    if materia is None:
        raise NotFoundError("Materia no encontrada")
    return materia.carrera_id


def resolve_carrera_from_semestre(db: Session, semestre_id: int) -> int:
    semestre = semestre_repo.get_by_id(db, semestre_id)
    if semestre is None:
        raise NotFoundError("Semestre no encontrado")
    return semestre.carrera_id


def resolve_carrera_from_elemento(db: Session, elemento_id: int) -> int:
    elemento = elemento_repo.get_by_id(db, elemento_id)
    if elemento is None:
        raise NotFoundError("Elemento no encontrado")
    return resolve_carrera_from_semestre(db, elemento.semestre_id)
