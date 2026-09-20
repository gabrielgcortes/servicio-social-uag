"""Endpoint de exportación a Excel de un plan curricular."""
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
from app.services import plan_curricular as plan_service

router = APIRouter(tags=["export"])

_MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/api/planes/{plan_id}/export/excel")
def exportar_excel(
    plan_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    plan = policies.require_view_plan(db, principal, plan_id)
    buffer = exportar_carrera(db, plan_id)
    nombre_archivo = f"mapa_{plan.clave}_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type=_MIME_XLSX,
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
