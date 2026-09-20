"""Endpoints de Semestre, anidados bajo planes y por ID para borrar."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.db.session import get_db
from app.schemas.semestre import SemestreCreate, SemestreRead
from app.services import semestre as semestre_service

router = APIRouter(tags=["semestres"])


@router.get("/api/planes/{plan_id}/semestres", response_model=list[SemestreRead])
def list_semestres(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[SemestreRead]:
    policies.require_view_plan(db, principal, plan_id)
    semestres = semestre_service.list_semestres(db, plan_id)
    return [SemestreRead.model_validate(s) for s in semestres]


@router.post(
    "/api/planes/{plan_id}/semestres", response_model=SemestreRead, status_code=201
)
def create_semestre(
    plan_id: int,
    payload: SemestreCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> SemestreRead:
    policies.require_edit_plan(db, principal, plan_id)
    semestre = semestre_service.create_semestre(
        db, plan_id, payload, actor_id=principal.usuario_id
    )
    return SemestreRead.model_validate(semestre)


@router.delete("/api/semestres/{semestre_id}", status_code=204, response_model=None)
def delete_semestre(
    semestre_id: int,
    force: bool = Query(default=False),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> None:
    plan_id = policies.resolve_plan_from_semestre(db, semestre_id)
    policies.require_edit_plan(db, principal, plan_id)
    semestre_service.delete_semestre(
        db, semestre_id, force=force, actor_id=principal.usuario_id
    )
