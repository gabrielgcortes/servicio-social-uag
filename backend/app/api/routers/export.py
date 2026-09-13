"""Endpoint de exportación a Excel del mapa curricular de una carrera."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.db.session import get_db
from app.exporters.excel.service import exportar_carrera
from app.services import carrera as carrera_service

router = APIRouter(tags=["export"])

_MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/api/carreras/{carrera_id}/export/excel")
def exportar_excel(
    carrera_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    policies.require_view_carrera(principal, carrera_id)
    carrera = carrera_service.get_carrera(db, carrera_id)
    buffer = exportar_carrera(db, carrera_id)
    nombre_archivo = f"mapa_{carrera.clave}_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type=_MIME_XLSX,
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
