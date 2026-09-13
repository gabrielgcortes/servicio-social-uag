"""Espejo en Python de la fórmula de créditos (la fuente de verdad es la columna
GENERATED de Postgres en Materia.creditos / SemestreElemento.creditos). Se usa
para previsualizar el valor antes de guardar y para validar en el motor de reglas."""
from decimal import ROUND_HALF_UP, Decimal


def calcular_creditos(horas_docente: int, horas_independientes: int) -> Decimal:
    total = Decimal(horas_docente + horas_independientes)
    return (total / Decimal(16)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def creditos_son_enteros(horas_docente: int, horas_independientes: int) -> bool:
    return (horas_docente + horas_independientes) % 16 == 0
