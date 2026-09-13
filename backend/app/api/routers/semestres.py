"""Endpoints de Semestre, anidados bajo carreras (y bajo /semestres/{id} para borrar)."""
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


@router.get("/api/carreras/{carrera_id}/semestres", response_model=list[SemestreRead])
def list_semestres(
    carrera_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[SemestreRead]:
    policies.require_view_carrera(principal, carrera_id)
    semestres = semestre_service.list_semestres(db, carrera_id)
    return [SemestreRead.model_validate(s) for s in semestres]


@router.post(
    "/api/carreras/{carrera_id}/semestres", response_model=SemestreRead, status_code=201
)
def create_semestre(
    carrera_id: int,
    payload: SemestreCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> SemestreRead:
    policies.require_edit_carrera(principal, carrera_id)
    semestre = semestre_service.create_semestre(db, carrera_id, payload)
    return SemestreRead.model_validate(semestre)


@router.delete("/api/semestres/{semestre_id}", status_code=204, response_model=None)
def delete_semestre(
    semestre_id: int,
    force: bool = Query(default=False),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> None:
    carrera_id = policies.resolve_carrera_from_semestre(db, semestre_id)
    policies.require_edit_carrera(principal, carrera_id)
    semestre_service.delete_semestre(db, semestre_id, force=force)
