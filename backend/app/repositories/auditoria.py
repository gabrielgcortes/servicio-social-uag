"""Acceso a datos de Auditoria. Solo lectura: se escribe desde services/audit.py."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auditoria import Auditoria


def list_auditoria(
    db: Session,
    *,
    carrera_id: int | None = None,
    entidad: str | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    limite: int = 200,
) -> list[Auditoria]:
    stmt = select(Auditoria)
    if carrera_id is not None:
        stmt = stmt.where(Auditoria.carrera_id == carrera_id)
    if entidad is not None:
        stmt = stmt.where(Auditoria.entidad == entidad)
    if desde is not None:
        stmt = stmt.where(Auditoria.created_at >= desde)
    if hasta is not None:
        stmt = stmt.where(Auditoria.created_at <= hasta)
    stmt = stmt.order_by(Auditoria.created_at.desc()).limit(limite)
    return list(db.execute(stmt).scalars())
