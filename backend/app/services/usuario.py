"""Reglas de negocio de administración de usuarios (solo ADMIN los invoca)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.repositories import carrera as carrera_repo
from app.repositories import usuario as usuario_repo
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


def list_usuarios(
    db: Session,
    *,
    rol: RolUsuario | None = None,
    carrera_id: int | None = None,
    activo: bool | None = None,
) -> list[Usuario]:
    return usuario_repo.list_usuarios(db, rol=rol, carrera_id=carrera_id, activo=activo)


def get_usuario(db: Session, usuario_id: int) -> Usuario:
    user = usuario_repo.get_by_id(db, usuario_id)
    if user is None:
        raise NotFoundError("Usuario no encontrado")
    return user


def create_usuario(db: Session, payload: UsuarioCreate) -> Usuario:
    if usuario_repo.get_by_email(db, payload.email) is not None:
        raise ConflictError("Ya existe un usuario con ese email")

    carreras = _resolver_carreras(db, payload.carrera_ids)
    user = Usuario(
        nombre=payload.nombre,
        email=payload.email,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        activo=payload.activo,
        carreras=carreras,
    )
    usuario_repo.add(db, user)
    db.commit()
    db.refresh(user)
    return user


def update_usuario(
    db: Session, usuario_id: int, payload: UsuarioUpdate, *, actor_id: int
) -> Usuario:
    user = get_usuario(db, usuario_id)
    campos_enviados = payload.model_fields_set

    nuevo_rol = payload.rol if "rol" in campos_enviados else user.rol
    nuevas_carreras = (
        _resolver_carreras(db, payload.carrera_ids or [])
        if "carrera_ids" in campos_enviados
        else user.carreras
    )
    if nuevo_rol != RolUsuario.ADMIN and not nuevas_carreras:
        raise BusinessRuleError("USUARIO y DIRECTOR deben tener al menos una carrera asignada")

    if payload.activo is False and usuario_id == actor_id:
        raise BusinessRuleError("Un administrador no puede desactivarse a sí mismo")

    if "nombre" in campos_enviados:
        user.nombre = payload.nombre
    if "rol" in campos_enviados:
        user.rol = payload.rol
    if "carrera_ids" in campos_enviados:
        user.carreras = nuevas_carreras
    if "activo" in campos_enviados:
        user.activo = payload.activo

    db.commit()
    db.refresh(user)
    return user


def _resolver_carreras(db: Session, carrera_ids: list[int]) -> list:
    if len(carrera_ids) != len(set(carrera_ids)):
        raise BusinessRuleError("No se puede asignar una carrera más de una vez")
    carreras = []
    for carrera_id in carrera_ids:
        carrera = carrera_repo.get_by_id(db, carrera_id)
        if carrera is None:
            raise NotFoundError(f"Carrera {carrera_id} no encontrada")
        carreras.append(carrera)
    return carreras


def deactivate_usuario(db: Session, usuario_id: int, *, actor_id: int) -> Usuario:
    if usuario_id == actor_id:
        raise BusinessRuleError("Un administrador no puede desactivarse a sí mismo")
    user = get_usuario(db, usuario_id)
    user.activo = False
    db.commit()
    db.refresh(user)
    return user
