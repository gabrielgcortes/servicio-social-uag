"""Consulta de la bitácora de auditoría: ADMIN ve todo; DIRECTOR solo su carrera."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.core.exceptions import ForbiddenError
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.repositories import auditoria as auditoria_repo
from app.schemas.auditoria import AuditoriaRead

router = APIRouter(tags=["auditoria"])


@router.get("/api/auditoria", response_model=list[AuditoriaRead])
def list_auditoria(
    carrera_id: int | None = Query(default=None),
    entidad: str | None = Query(default=None),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[AuditoriaRead]:
    if principal.rol == RolUsuario.USUARIO:
        raise ForbiddenError("No tienes acceso a la auditoría")
    if principal.rol == RolUsuario.DIRECTOR:
        if carrera_id is not None and carrera_id != principal.carrera_id:
            raise ForbiddenError("Solo puedes consultar la auditoría de tu carrera")
        carrera_id = principal.carrera_id

    registros = auditoria_repo.list_auditoria(
        db, carrera_id=carrera_id, entidad=entidad, desde=desde, hasta=hasta
    )
    return [AuditoriaRead.model_validate(r) for r in registros]
