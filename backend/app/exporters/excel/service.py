"""Orquesta la exportación a Excel: arma el workbook (a partir de la plantilla
institucional si existe, o desde cero como fallback) y devuelve los bytes en
memoria, sin archivos temporales."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

from openpyxl import Workbook, load_workbook
from sqlalchemy.orm import Session

from app.exporters.excel.layout import HOJA_MAPA, HOJA_OPTATIVAS
from app.exporters.excel.mapa_curricular_exporter import escribir_mapa
from app.exporters.excel.optativas_exporter import escribir_optativas
from app.models.enums import TipoMateria
from app.repositories import materia as materia_repo
from app.services import mapa as mapa_service

_TEMPLATE_PATH = Path(__file__).resolve().parents[3] / "templates" / "mapa_curricular.xlsx"


def _crear_workbook() -> Workbook:
    if _TEMPLATE_PATH.exists():
        wb = load_workbook(_TEMPLATE_PATH)
        # La plantilla institucional puede traer hojas de ejemplo con otro
        # nombre/contenido; se reemplazan por hojas limpias para los datos.
        for nombre in (HOJA_MAPA, HOJA_OPTATIVAS):
            if nombre in wb.sheetnames:
                del wb[nombre]
        wb.create_sheet(HOJA_MAPA)
        wb.create_sheet(HOJA_OPTATIVAS)
        return wb

    wb = Workbook()
    wb.remove(wb.active)
    wb.create_sheet(HOJA_MAPA)
    wb.create_sheet(HOJA_OPTATIVAS)
    return wb


def exportar_carrera(db: Session, plan_id: int) -> BytesIO:
    mapa = mapa_service.get_mapa(db, plan_id)
    optativas = materia_repo.list_by_plan(db, plan_id, tipo=TipoMateria.OPTATIVA)

    wb = _crear_workbook()
    escribir_mapa(wb[HOJA_MAPA], mapa)
    escribir_optativas(wb[HOJA_OPTATIVAS], optativas)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
