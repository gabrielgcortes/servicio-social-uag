"""Registro de auditoría: quién hizo qué cambio importante y cuándo. Se puebla
explícitamente desde services/ (no con eventos ORM ni triggers) para tener
siempre el contexto del actor HTTP. Un fallo al auditar no debe invalidar la
operación de negocio: se captura y se loguea."""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.auditoria import Auditoria

logger = logging.getLogger(__name__)


def registrar(
    db: Session,
    *,
    usuario_id: int | None,
    accion: str,
    entidad: str,
    entidad_id: int,
    carrera_id: int | None = None,
    plan_curricular_id: int | None = None,
    datos_antes: dict | None = None,
    datos_despues: dict | None = None,
) -> None:
    try:
        db.add(
            Auditoria(
                usuario_id=usuario_id,
                accion=accion,
                entidad=entidad,
                entidad_id=entidad_id,
                carrera_id=carrera_id,
                plan_curricular_id=plan_curricular_id,
                datos_antes=datos_antes,
                datos_despues=datos_despues,
            )
        )
    except Exception:  # noqa: BLE001 - la auditoría nunca debe tumbar la operación
        logger.exception("No se pudo registrar la auditoría de %s#%s", entidad, entidad_id)
