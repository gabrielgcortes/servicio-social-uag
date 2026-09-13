"""Schema de lectura de Auditoria."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditoriaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int | None
    accion: str
    entidad: str
    entidad_id: int
    carrera_id: int | None
    datos_antes: dict | None
    datos_despues: dict | None
    created_at: datetime
