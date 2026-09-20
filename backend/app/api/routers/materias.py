"""Endpoints de Materia: catálogo de la carrera (obligatorias y optativas)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.db.session import get_db
from app.models.enums import TipoMateria
from app.schemas.materia import (
    MateriaCreate,
    MateriaMutationResponse,
    MateriaRead,
    MateriaUpdate,
    OptativaInstitucionalRead,
)
from app.services import materia as materia_service

router = APIRouter(tags=["materias"])


@router.get("/api/catalogos/optativas-institucionales", response_model=list[OptativaInstitucionalRead])
def list_optativas_institucionales(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[OptativaInstitucionalRead]:
    return [OptativaInstitucionalRead.model_validate(o) for o in materia_service.list_optativas_institucionales(db)]


@router.get("/api/planes/{plan_id}/materias", response_model=list[MateriaRead])
def list_materias(
    plan_id: int,
    tipo: TipoMateria | None = Query(default=None),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[MateriaRead]:
    policies.require_view_plan(db, principal, plan_id)
    materias = materia_service.list_materias(db, plan_id, tipo=tipo)
    return [MateriaRead.model_validate(m) for m in materias]


@router.post(
    "/api/planes/{plan_id}/materias",
    response_model=MateriaMutationResponse,
    status_code=201,
)
def create_materia(
    plan_id: int,
    payload: MateriaCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> MateriaMutationResponse:
    policies.require_edit_plan(db, principal, plan_id)
    materia, warnings = materia_service.create_materia(
        db, plan_id, payload, actor_id=principal.usuario_id
    )
    return MateriaMutationResponse(materia=MateriaRead.model_validate(materia), warnings=warnings)


@router.get("/api/materias/{materia_id}", response_model=MateriaRead)
def get_materia(
    materia_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> MateriaRead:
    plan_id = policies.resolve_plan_from_materia(db, materia_id)
    policies.require_view_plan(db, principal, plan_id)
    materia = materia_service.get_materia(db, materia_id)
    return MateriaRead.model_validate(materia)


@router.patch("/api/materias/{materia_id}", response_model=MateriaMutationResponse)
def update_materia(
    materia_id: int,
    payload: MateriaUpdate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> MateriaMutationResponse:
    plan_id = policies.resolve_plan_from_materia(db, materia_id)
    policies.require_edit_plan(db, principal, plan_id)
    materia, warnings = materia_service.update_materia(
        db, materia_id, payload, actor_id=principal.usuario_id
    )
    return MateriaMutationResponse(materia=MateriaRead.model_validate(materia), warnings=warnings)


@router.delete("/api/materias/{materia_id}", status_code=204, response_model=None)
def delete_materia(
    materia_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> None:
    plan_id = policies.resolve_plan_from_materia(db, materia_id)
    policies.require_edit_plan(db, principal, plan_id)
    materia_service.delete_materia(db, materia_id, actor_id=principal.usuario_id)


# --- Catálogo de optativas: mismo servicio, tipo forzado a OPTATIVA ---------
# (TASK-029: evita duplicar CRUD/reglas para "las materias reales del catálogo
# de optativas" — ver decisión arquitectónica #4 del plan).


@router.get("/api/planes/{plan_id}/optativas", response_model=list[MateriaRead])
def list_optativas(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[MateriaRead]:
    policies.require_view_plan(db, principal, plan_id)
    materias = materia_service.list_materias(db, plan_id, tipo=TipoMateria.OPTATIVA)
    return [MateriaRead.model_validate(m) for m in materias]


@router.post(
    "/api/planes/{plan_id}/optativas",
    response_model=MateriaMutationResponse,
    status_code=201,
)
def create_optativa(
    plan_id: int,
    payload: MateriaCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> MateriaMutationResponse:
    policies.require_edit_plan(db, principal, plan_id)
    payload_optativa = payload.model_copy(update={"tipo": TipoMateria.OPTATIVA})
    materia, warnings = materia_service.create_materia(
        db, plan_id, payload_optativa, actor_id=principal.usuario_id
    )
    return MateriaMutationResponse(materia=MateriaRead.model_validate(materia), warnings=warnings)
