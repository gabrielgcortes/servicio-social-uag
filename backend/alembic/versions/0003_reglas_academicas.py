"""reglas académicas configurables, campos de materia y excepciones

Revision ID: 0003_reglas_academicas
Revises: 0002_planes_usuario_carrera
Create Date: 2026-09-19
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_reglas_academicas"
down_revision: Union[str, None] = "0002_planes_usuario_carrera"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(nombre: str, *valores: str) -> postgresql.ENUM:
    enum = postgresql.ENUM(*valores, name=nombre, create_type=False)
    enum.create(op.get_bind(), checkfirst=True)
    return enum


def upgrade() -> None:
    nivel = _enum("nivel_academico", "LICENCIATURA", "ESPECIALIDAD", "MAESTRIA", "DOCTORADO")
    modalidad = _enum("modalidad_programa", "ESCOLARIZADA", "NO_ESCOLARIZADA", "MIXTA")
    decanato = _enum("decanato", "DISENO_CIENCIA_TECNOLOGIA", "CIENCIAS_SOCIALES_ECONOMICAS_ADMINISTRATIVAS", "OTRO")
    reconocimiento = _enum("tipo_reconocimiento", "FEDERAL", "ESTATAL")
    area = _enum("area_formacion", "UNIVERSITARIA", "BASICA", "DISCIPLINAR", "PROFESIONAL", "FUNDAMENTAL", "TERMINAL_INVESTIGACION")
    aula = _enum("tipo_aula", "A", "L", "O")
    tipo_excepcion = _enum("tipo_excepcion", "OPTATIVA_HORAS_MINIMAS", "NUMERO_CICLOS", "REGLA_CUANTITATIVA")

    op.add_column("plan_curricular", sa.Column("nivel_academico", nivel, nullable=False, server_default="LICENCIATURA"))
    op.add_column("plan_curricular", sa.Column("modalidad", modalidad, nullable=False, server_default="ESCOLARIZADA"))
    op.add_column("plan_curricular", sa.Column("decanato", decanato, nullable=False, server_default="OTRO"))
    op.add_column("plan_curricular", sa.Column("decanato_otro", sa.String(150), nullable=True))
    op.add_column("plan_curricular", sa.Column("tipo_reconocimiento", reconocimiento, nullable=False, server_default="FEDERAL"))
    op.add_column("plan_curricular", sa.Column("mnemonico", sa.String(12), nullable=True))
    op.add_column("plan_curricular", sa.Column("texto_administrativo_flexible", sa.Text(), nullable=True))
    op.execute("""
        UPDATE plan_curricular p SET
          mnemonico = LEFT(COALESCE(NULLIF(regexp_replace(upper(c.clave), '[^A-Z0-9]', '', 'g'), ''), 'PLAN'), 12),
          decanato_otro = 'No especificado'
        FROM carrera c WHERE c.id = p.carrera_id
    """)
    op.alter_column("plan_curricular", "mnemonico", nullable=False, server_default="PLAN")
    op.create_check_constraint("ck_plan_mnemonico_formato", "plan_curricular", "mnemonico ~ '^[A-Z][A-Z0-9]*$'")

    # Convierte el texto libre legado de modalidad al catálogo; valores no
    # reconocidos quedan NULL para no inventar una equivalencia.
    op.alter_column(
        "materia", "modalidad", type_=modalidad,
        postgresql_using="CASE WHEN upper(replace(modalidad, ' ', '_')) IN ('ESCOLARIZADA','NO_ESCOLARIZADA','MIXTA') THEN upper(replace(modalidad, ' ', '_'))::modalidad_programa ELSE NULL END",
    )
    op.add_column("materia", sa.Column("tipo_aula", aula, nullable=True))
    op.add_column("materia", sa.Column("area_formacion", area, nullable=True))
    op.add_column("materia", sa.Column("aporte_sustancial", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("docente_sugerido", sa.String(200), nullable=True))
    op.add_column("materia", sa.Column("programa_asignatura", sa.Text(), nullable=True))
    op.add_column("materia", sa.Column("usa_numeracion_romana", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("es_capstone", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("es_practica_profesional", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("es_topico_selecto", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("excepcion_horas_estandar", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("materia", sa.Column("ciclos_disponibles", postgresql.ARRAY(sa.Integer()), nullable=False, server_default="{}"))
    op.execute("UPDATE materia SET tipo_aula = CASE WHEN upper(instalaciones) IN ('A','L','O') THEN upper(instalaciones)::tipo_aula ELSE NULL END")

    op.create_table(
        "configuracion_reglas_plan",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("plan_curricular_id", sa.BigInteger(), sa.ForeignKey("plan_curricular.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("vigente", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("vigente_desde", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("duracion_ciclo_semanas", sa.Integer(), nullable=False),
        sa.Column("ciclos_esperados", sa.Integer(), nullable=False),
        sa.Column("max_creditos_ciclo", sa.Numeric(7, 2), nullable=False, server_default="50"),
        sa.Column("max_materias_ciclo", sa.Integer(), nullable=True),
        sa.Column("min_creditos_plan", sa.Numeric(8, 2), nullable=True),
        sa.Column("max_creditos_plan", sa.Numeric(8, 2), nullable=True),
        sa.Column("min_horas_plan", sa.Integer(), nullable=True),
        sa.Column("multiplo_horas", sa.Integer(), nullable=False),
        sa.Column("materias_por_ciclo", sa.Integer(), nullable=True),
        sa.Column("prohibir_seriacion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("optativa_min_horas_docente", sa.Integer(), nullable=True),
        sa.Column("optativa_min_horas_independientes", sa.Integer(), nullable=True),
        sa.Column("practicas_min_periodos", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("practicas_max_periodos", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("practicas_min_horas", sa.Integer(), nullable=False, server_default="320"),
        sa.Column("practicas_max_horas", sa.Integer(), nullable=False, server_default="1280"),
        sa.Column("practicas_min_creditos", sa.Numeric(7, 2), nullable=False, server_default="20"),
        sa.Column("practicas_max_creditos", sa.Numeric(7, 2), nullable=False, server_default="80"),
        sa.Column("capstone_min", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("capstone_max", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("horas_docente_estandar", sa.Integer(), nullable=True),
        sa.Column("horas_independientes_estandar", sa.Integer(), nullable=True),
        sa.Column("creditos_estandar", sa.Numeric(7, 2), nullable=True),
        sa.Column("reglas_adicionales", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("plan_curricular_id", "version", name="uq_config_reglas_plan_version"),
        sa.CheckConstraint("version > 0", name="ck_config_reglas_version_positiva"),
        sa.CheckConstraint("duracion_ciclo_semanas > 0", name="ck_config_duracion_positiva"),
        sa.CheckConstraint("ciclos_esperados > 0", name="ck_config_ciclos_positivos"),
        sa.CheckConstraint("max_creditos_ciclo > 0", name="ck_config_max_creditos_positivo"),
    )
    op.create_index("ix_configuracion_reglas_plan_plan_curricular_id", "configuracion_reglas_plan", ["plan_curricular_id"])
    op.create_index("ux_config_reglas_vigente", "configuracion_reglas_plan", ["plan_curricular_id"], unique=True, postgresql_where=sa.text("vigente"))

    op.execute("""
        INSERT INTO configuracion_reglas_plan (
          plan_curricular_id, version, duracion_ciclo_semanas, ciclos_esperados,
          max_creditos_ciclo, max_materias_ciclo, min_creditos_plan, max_creditos_plan,
          min_horas_plan, multiplo_horas, materias_por_ciclo, prohibir_seriacion,
          optativa_min_horas_docente, optativa_min_horas_independientes, reglas_adicionales
        ) SELECT id, 1, 16, 8, max_creditos_semestre, 7, 300, 400, 4800, 16,
          NULL, false, 32, 64, '{"materias_requeridas":[],"materias_nucleo":[]}'::jsonb
        FROM plan_curricular
    """)

    op.create_table(
        "autorizacion_excepcion",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("plan_curricular_id", sa.BigInteger(), sa.ForeignKey("plan_curricular.id", ondelete="CASCADE"), nullable=False),
        sa.Column("materia_id", sa.BigInteger(), sa.ForeignKey("materia.id", ondelete="CASCADE"), nullable=True),
        sa.Column("tipo", tipo_excepcion, nullable=False),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("responsable", sa.String(200), nullable=False),
        sa.Column("autorizada_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_autorizacion_excepcion_plan_curricular_id", "autorizacion_excepcion", ["plan_curricular_id"])


def downgrade() -> None:
    op.drop_index("ix_autorizacion_excepcion_plan_curricular_id", table_name="autorizacion_excepcion")
    op.drop_table("autorizacion_excepcion")
    op.drop_index("ux_config_reglas_vigente", table_name="configuracion_reglas_plan")
    op.drop_index("ix_configuracion_reglas_plan_plan_curricular_id", table_name="configuracion_reglas_plan")
    op.drop_table("configuracion_reglas_plan")

    for columna in ("ciclos_disponibles", "excepcion_horas_estandar", "es_topico_selecto", "es_practica_profesional", "es_capstone", "usa_numeracion_romana", "programa_asignatura", "docente_sugerido", "aporte_sustancial", "area_formacion", "tipo_aula"):
        op.drop_column("materia", columna)
    op.alter_column("materia", "modalidad", type_=sa.String(50), postgresql_using="modalidad::text")

    op.drop_constraint("ck_plan_mnemonico_formato", "plan_curricular", type_="check")
    for columna in ("texto_administrativo_flexible", "mnemonico", "tipo_reconocimiento", "decanato_otro", "decanato", "modalidad", "nivel_academico"):
        op.drop_column("plan_curricular", columna)

    for nombre in ("tipo_excepcion", "tipo_aula", "area_formacion", "tipo_reconocimiento", "decanato", "modalidad_programa", "nivel_academico"):
        op.execute(f"DROP TYPE IF EXISTS {nombre}")
