"""Consulta de auditoría: ADMIN ve todo; DIRECTOR solo sus carreras y planes."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_principal
from app.auth import policies
from app.auth.principal import Principal
from app.core.exceptions import ForbiddenError
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.repositories import auditoria as auditoria_repo
from app.repositories import carrera as carrera_repo
from app.schemas.auditoria import AuditoriaRead

router = APIRouter(tags=["auditoria"])


@router.get("/api/auditoria", response_model=list[AuditoriaRead])
def list_auditoria(
    carrera_id: int | None = Query(default=None),
    plan_curricular_id: int | None = Query(default=None),
    entidad: str | None = Query(default=None),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[AuditoriaRead]:
    if principal.rol == RolUsuario.USUARIO:
        raise ForbiddenError("No tienes acceso a la auditoría")
    if principal.rol == RolUsuario.DIRECTOR:
        if carrera_id is not None:
            policies.require_view_carrera(db, principal, carrera_id)
            carrera_ids = None
        else:
            carrera_ids = [c.id for c in carrera_repo.list_for_usuario(db, principal.usuario_id)]
        if plan_curricular_id is not None:
            policies.require_view_plan(db, principal, plan_curricular_id)
    else:
        carrera_ids = None

    registros = auditoria_repo.list_auditoria(
        db,
        carrera_id=carrera_id,
        carrera_ids=carrera_ids,
        plan_curricular_id=plan_curricular_id,
        entidad=entidad,
        desde=desde,
        hasta=hasta,
    )
    return [AuditoriaRead.model_validate(r) for r in registros]
