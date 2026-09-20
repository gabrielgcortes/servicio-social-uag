"""Endpoints de Carrera: ADMIN ve/edita todas; DIRECTOR y USUARIO solo la suya."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal, require_roles
from app.auth.principal import Principal
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.schemas.carrera import CarreraCreate, CarreraRead, CarreraUpdate
from app.services import carrera as carrera_service

router = APIRouter(prefix="/api/carreras", tags=["carreras"])
_solo_admin = require_roles(RolUsuario.ADMIN)


@router.get("", response_model=list[CarreraRead])
def list_carreras(
    principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> list[CarreraRead]:
    carreras = carrera_service.list_carreras_for_principal(db, principal)
    return [CarreraRead.model_validate(c) for c in carreras]


@router.post("", response_model=CarreraRead, status_code=201)
def create_carrera(
    payload: CarreraCreate,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> CarreraRead:
    carrera = carrera_service.create_carrera(db, payload, actor_id=principal.usuario_id)
    return CarreraRead.model_validate(carrera)


@router.get("/{carrera_id}", response_model=CarreraRead)
def get_carrera(
    carrera_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> CarreraRead:
    policies.require_view_carrera(db, principal, carrera_id)
    carrera = carrera_service.get_carrera(db, carrera_id)
    return CarreraRead.model_validate(carrera)


@router.patch("/{carrera_id}", response_model=CarreraRead)
def update_carrera(
    carrera_id: int,
    payload: CarreraUpdate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> CarreraRead:
    policies.require_edit_carrera(db, principal, carrera_id)
    carrera = carrera_service.update_carrera(
        db,
        carrera_id,
        payload,
        es_admin=principal.rol == RolUsuario.ADMIN,
        actor_id=principal.usuario_id,
    )
    return CarreraRead.model_validate(carrera)


@router.delete("/{carrera_id}", response_model=CarreraRead)
def deactivate_carrera(
    carrera_id: int,
    principal: Principal = Depends(_solo_admin),
    db: Session = Depends(get_db),
) -> CarreraRead:
    carrera = carrera_service.deactivate_carrera(db, carrera_id, actor_id=principal.usuario_id)
    return CarreraRead.model_validate(carrera)
