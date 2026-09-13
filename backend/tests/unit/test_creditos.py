"""Unit tests de la fórmula de créditos (services/creditos.py) — cubre los
4 ejemplos exactos del enunciado."""
from decimal import Decimal

from app.services.creditos import calcular_creditos, creditos_son_enteros


def test_ejemplos_del_enunciado():
    assert calcular_creditos(48, 48) == Decimal("6.00")
    assert calcular_creditos(48, 64) == Decimal("7.00")
    assert calcular_creditos(64, 80) == Decimal("9.00")
    assert calcular_creditos(32, 64) == Decimal("6.00")


def test_creditos_no_enteros():
    assert creditos_son_enteros(48, 48) is True
    assert creditos_son_enteros(48, 50) is False
