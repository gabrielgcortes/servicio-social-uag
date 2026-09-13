"""Constantes de layout del Excel exportado. Centralizar aquí las coordenadas
evita esparcir literales por el código; ajustar tras correr
scripts/inspect_template.py contra la plantilla institucional
(templates/mapa_curricular.xlsx) y compartir sus resultados."""
from __future__ import annotations

HOJA_MAPA = "Mapa curricular"
HOJA_OPTATIVAS = "Optativas"

FILA_INICIAL_MAPA = 1
COLUMNAS_MAPA = [
    "Semestre",
    "Clave",
    "Nombre",
    "Horas docente",
    "Horas independientes",
    "Créditos",
    "Tipo",
]

FILA_INICIAL_OPTATIVAS = 1
COLUMNAS_OPTATIVAS = [
    "Clave",
    "Nombre",
    "Horas docente",
    "Horas independientes",
    "Créditos",
    "Instalaciones",
    "Modalidad",
    "Seriación",
]
