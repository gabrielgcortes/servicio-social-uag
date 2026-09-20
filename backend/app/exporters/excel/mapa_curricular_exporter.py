"""Escribe la hoja "Mapa curricular" a partir del payload de services/mapa.py
(dict con carrera + semestres + elementos ORM ya cargados)."""
from __future__ import annotations

from openpyxl.worksheet.worksheet import Worksheet

from app.exporters.excel.layout import COLUMNAS_MAPA, FILA_INICIAL_MAPA
from app.models.enums import TipoElemento


def escribir_mapa(hoja: Worksheet, mapa: dict) -> None:
    fila = FILA_INICIAL_MAPA
    for columna, encabezado in enumerate(COLUMNAS_MAPA, start=1):
        hoja.cell(row=fila, column=columna, value=encabezado)
    fila += 1

    for semestre in mapa["semestres"]:
        for elemento in semestre["elementos"]:
            if elemento.tipo == TipoElemento.MATERIA:
                materia = elemento.materia
                valores = [
                    semestre["numero"],
                    materia.clave if materia else "",
                    materia.nombre if materia else "",
                    materia.horas_docente if materia else "",
                    materia.horas_independientes if materia else "",
                    float(materia.creditos) if materia and materia.creditos is not None else "",
                    "Obligatoria",
                    materia.area_formacion.value if materia and materia.area_formacion else "",
                    materia.tipo_aula.value if materia and materia.tipo_aula else (materia.instalaciones or "" if materia else ""),
                    materia.modalidad.value if materia and materia.modalidad else "",
                    materia.docente_sugerido or "" if materia else "",
                    "Sí" if materia and materia.aporte_sustancial else "No",
                    materia.programa_asignatura or "" if materia else "",
                ]
            else:
                valores = [
                    semestre["numero"],
                    "",
                    elemento.nombre,
                    elemento.horas_docente,
                    elemento.horas_independientes,
                    float(elemento.creditos) if elemento.creditos is not None else "",
                    "Espacio optativo",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            for columna, valor in enumerate(valores, start=1):
                hoja.cell(row=fila, column=columna, value=valor)
            fila += 1
