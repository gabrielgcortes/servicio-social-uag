"""Endpoints de planes curriculares y su mapa versionado."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.db.session import get_db
from app.schemas.mapa import MapaCurricular
from app.schemas.plan_curricular import (
    PlanCurricularCreate,
    PlanCurricularRead,
    PlanCurricularUpdate,
    PlanDuplicarRequest,
)
from app.services import mapa as mapa_service
from app.services import plan_curricular as plan_service

router = APIRouter(tags=["planes"])


@router.get("/api/carreras/{carrera_id}/planes", response_model=list[PlanCurricularRead])
def list_planes(
    carrera_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[PlanCurricularRead]:
    policies.require_view_carrera(db, principal, carrera_id)
    return [PlanCurricularRead.model_validate(p) for p in plan_service.list_planes(db, carrera_id)]


@router.post(
    "/api/carreras/{carrera_id}/planes", response_model=PlanCurricularRead, status_code=201
)
def create_plan(
    carrera_id: int,
    payload: PlanCurricularCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> PlanCurricularRead:
    policies.require_edit_carrera(db, principal, carrera_id)
    return PlanCurricularRead.model_validate(
        plan_service.create_plan(db, carrera_id, payload, actor_id=principal.usuario_id)
    )


@router.get("/api/planes/{plan_id}", response_model=PlanCurricularRead)
def get_plan(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> PlanCurricularRead:
    plan = policies.require_view_plan(db, principal, plan_id)
    return PlanCurricularRead.model_validate(plan)


@router.patch("/api/planes/{plan_id}", response_model=PlanCurricularRead)
def update_plan(
    plan_id: int,
    payload: PlanCurricularUpdate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> PlanCurricularRead:
    policies.require_edit_plan(db, principal, plan_id)
    return PlanCurricularRead.model_validate(
        plan_service.update_plan(db, plan_id, payload, actor_id=principal.usuario_id)
    )


@router.post("/api/planes/{plan_id}/duplicar", response_model=PlanCurricularRead, status_code=201)
def duplicar_plan(
    plan_id: int,
    payload: PlanDuplicarRequest,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> PlanCurricularRead:
    policies.require_edit_plan(db, principal, plan_id)
    return PlanCurricularRead.model_validate(
        plan_service.duplicar_plan(db, plan_id, payload, actor_id=principal.usuario_id)
    )


@router.post("/api/planes/{plan_id}/validar", response_model=list[dict])
def validar_plan(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[dict]:
    policies.require_view_plan(db, principal, plan_id)
    return plan_service.validar_plan(db, plan_id)


@router.get("/api/planes/{plan_id}/mapa", response_model=MapaCurricular)
def get_mapa(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> MapaCurricular:
    policies.require_view_plan(db, principal, plan_id)
    return MapaCurricular.model_validate(mapa_service.get_mapa(db, plan_id))
