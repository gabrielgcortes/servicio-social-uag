"""Administración de usuarios — todos los endpoints requieren rol ADMIN."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import require_roles
from app.auth.principal import Principal
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.schemas.usuario import UsuarioCreate, UsuarioRead, UsuarioUpdate
from app.services import usuario as usuario_service

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])
_solo_admin = require_roles(RolUsuario.ADMIN)


@router.get("", response_model=list[UsuarioRead])
def list_usuarios(
    rol: RolUsuario | None = Query(default=None),
    carrera_id: int | None = Query(default=None),
    activo: bool | None = Query(default=None),
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> list[UsuarioRead]:
    usuarios = usuario_service.list_usuarios(db, rol=rol, carrera_id=carrera_id, activo=activo)
    return [UsuarioRead.model_validate(u) for u in usuarios]


@router.post("", response_model=UsuarioRead, status_code=201)
def create_usuario(
    payload: UsuarioCreate,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> UsuarioRead:
    user = usuario_service.create_usuario(db, payload)
    return UsuarioRead.model_validate(user)


@router.get("/{usuario_id}", response_model=UsuarioRead)
def get_usuario(
    usuario_id: int,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> UsuarioRead:
    user = usuario_service.get_usuario(db, usuario_id)
    return UsuarioRead.model_validate(user)


@router.patch("/{usuario_id}", response_model=UsuarioRead)
def update_usuario(
    usuario_id: int,
    payload: UsuarioUpdate,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> UsuarioRead:
    user = usuario_service.update_usuario(
        db, usuario_id, payload, actor_id=principal.usuario_id
    )
    return UsuarioRead.model_validate(user)


@router.delete("/{usuario_id}", response_model=UsuarioRead)
def deactivate_usuario(
    usuario_id: int,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> UsuarioRead:
    user = usuario_service.deactivate_usuario(db, usuario_id, actor_id=principal.usuario_id)
    return UsuarioRead.model_validate(user)
