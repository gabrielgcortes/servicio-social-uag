"""Orquesta la exportación a Excel: arma el workbook (a partir de la plantilla
institucional si existe, o desde cero como fallback) y devuelve los bytes en
memoria, sin archivos temporales."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

from openpyxl import Workbook, load_workbook
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.exporters.excel.layout import HOJA_FLEXIBLE, HOJA_MAPA, HOJA_OPTATIVAS
from app.exporters.excel.mapa_curricular_exporter import escribir_mapa
from app.exporters.excel.optativas_exporter import escribir_optativas
from app.exporters.excel.flexible_exporter import escribir_flexible
from app.models.enums import ModalidadPrograma, NivelAcademico, TipoElemento, TipoMateria, TipoReconocimiento
from app.models.optativa_institucional import OptativaInstitucional
from app.repositories import materia as materia_repo
from app.services import mapa as mapa_service

_TEMPLATE_PATH = Path(__file__).resolve().parents[3] / "templates" / "mapa_curricular.xlsx"


def _crear_workbook() -> Workbook:
    if _TEMPLATE_PATH.exists():
        wb = load_workbook(_TEMPLATE_PATH)
        # La plantilla institucional puede traer hojas de ejemplo con otro
        # nombre/contenido; se reemplazan por hojas limpias para los datos.
        for nombre in (HOJA_MAPA, HOJA_OPTATIVAS, HOJA_FLEXIBLE):
            if nombre in wb.sheetnames:
                del wb[nombre]
        wb.create_sheet(HOJA_MAPA)
        return wb

    wb = Workbook()
    wb.remove(wb.active)
    wb.create_sheet(HOJA_MAPA)
    return wb


def exportar_carrera(db: Session, plan_id: int) -> BytesIO:
    mapa = mapa_service.get_mapa(db, plan_id)
    optativas = materia_repo.list_by_plan(db, plan_id, tipo=TipoMateria.OPTATIVA)

    wb = _crear_workbook()
    escribir_mapa(wb[HOJA_MAPA], mapa)
    plan = mapa["plan"]
    es_flexible = plan.tipo_reconocimiento == TipoReconocimiento.FEDERAL and plan.modalidad in {ModalidadPrograma.MIXTA, ModalidadPrograma.NO_ESCOLARIZADA}
    if es_flexible:
        hoja = wb.create_sheet(HOJA_FLEXIBLE)
        escribir_flexible(hoja, mapa)
    else:
        hoja = wb.create_sheet(HOJA_OPTATIVAS)
        ciclos = [s["numero"] for s in mapa["semestres"] if any(e.tipo == TipoElemento.ESPACIO_OPTATIVO for e in s["elementos"])]
        institucionales = []
        if plan.nivel_academico == NivelAcademico.LICENCIATURA:
            institucionales = list(db.execute(select(OptativaInstitucional.nombre).where(OptativaInstitucional.activa.is_(True)).order_by(OptativaInstitucional.orden)).scalars())
        escribir_optativas(hoja, optativas, institucionales=institucionales, ciclos_institucionales=ciclos)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
