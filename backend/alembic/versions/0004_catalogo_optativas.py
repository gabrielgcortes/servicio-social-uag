"""catálogo institucional de optativas y restricciones de configuración

Revision ID: 0004_catalogo_optativas
Revises: 0003_reglas_academicas
Create Date: 2026-09-19
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_catalogo_optativas"
down_revision: Union[str, None] = "0003_reglas_academicas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NOMBRES = [
    "Inteligencia emocional", "Estrategias de aprendizaje", "Habilidades directivas",
    "Comunicación efectiva", "Hábitos de vida saludable", "Negociación",
    "Teoría de la gestión de proyectos", "El proyecto reflexivo: alinear el propósito con el enfoque",
    "Evaluación de proyectos y programas", "Liderando equipos integradores",
    "Administración de la contabilidad global", "Liderazgo para la toma de decisiones basada en datos",
    "Liderazgo global y desarrollo personal", "Administración y estrategia global de mercadotecnia",
    "Análisis de datos empresariales",
    "Programación para la inteligencia artificial y el análisis de datos empresarial",
    "Aprendizaje automático en los negocios", "Visualización de datos empresariales",
]


def upgrade() -> None:
    restricciones = {
        "ck_config_rango_creditos_plan": "min_creditos_plan IS NULL OR max_creditos_plan IS NULL OR min_creditos_plan <= max_creditos_plan",
        "ck_config_rango_periodos_practicas": "practicas_min_periodos <= practicas_max_periodos",
        "ck_config_rango_horas_practicas": "practicas_min_horas <= practicas_max_horas",
        "ck_config_rango_creditos_practicas": "practicas_min_creditos <= practicas_max_creditos",
        "ck_config_rango_capstone": "capstone_min <= capstone_max",
    }
    for nombre, condicion in restricciones.items():
        op.execute(sa.text(f"""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{nombre}') THEN
                    ALTER TABLE configuracion_reglas_plan ADD CONSTRAINT {nombre} CHECK ({condicion});
                END IF;
            END $$
        """))
    tabla = op.create_table(
        "optativa_institucional",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nombre", sa.String(250), nullable=False, unique=True),
        sa.Column("orden", sa.Integer(), nullable=False, unique=True),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.bulk_insert(tabla, [{"nombre": nombre, "orden": orden} for orden, nombre in enumerate(NOMBRES, 1)])


def downgrade() -> None:
    op.drop_table("optativa_institucional")
    for nombre in (
        "ck_config_rango_capstone", "ck_config_rango_creditos_practicas",
        "ck_config_rango_horas_practicas", "ck_config_rango_periodos_practicas",
        "ck_config_rango_creditos_plan",
    ):
        op.execute(sa.text(f"ALTER TABLE configuracion_reglas_plan DROP CONSTRAINT IF EXISTS {nombre}"))
