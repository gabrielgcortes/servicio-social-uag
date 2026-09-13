"""initial schema: carrera, semestre, materia, semestre_elemento, usuario,
refresh_token, auditoria + vista v_semestre_totales

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-31

Escrita a mano (sin autogenerate) para tener control total sobre constraints,
columnas generadas e índices parciales que SQLAlchemy autogenerate no siempre
reproduce fielmente.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    # --- carrera -----------------------------------------------------------
    op.create_table(
        "carrera",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("clave", sa.String(20), nullable=False, unique=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "max_creditos_semestre", sa.Integer(), nullable=False, server_default="50"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "max_creditos_semestre > 0", name="ck_carrera_max_creditos_positivo"
        ),
    )

    # --- semestre ------------------------------------------------------------
    op.create_table(
        "semestre",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("carrera_id", "numero", name="uq_semestre_carrera_numero"),
        sa.CheckConstraint("numero BETWEEN 1 AND 20", name="ck_semestre_numero_rango"),
    )

    # --- materia -------------------------------------------------------------
    tipo_materia = postgresql.ENUM(
        "OBLIGATORIA", "OPTATIVA", name="tipo_materia", create_type=False
    )
    tipo_materia.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "materia",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("clave", sa.String(20), nullable=False),
        sa.Column("nombre", sa.String(250), nullable=False),
        sa.Column("horas_docente", sa.Integer(), nullable=False),
        sa.Column("horas_independientes", sa.Integer(), nullable=False),
        sa.Column(
            "creditos",
            sa.Numeric(6, 2),
            sa.Computed(
                "(horas_docente + horas_independientes)::numeric / 16", persisted=True
            ),
        ),
        sa.Column("instalaciones", sa.String(200), nullable=True),
        sa.Column("modalidad", sa.String(50), nullable=True),
        sa.Column("tipo", tipo_materia, nullable=False),
        sa.Column(
            "seriacion_materia_id",
            sa.BigInteger(),
            sa.ForeignKey("materia.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("carrera_id", "clave", name="uq_materia_carrera_clave"),
        sa.CheckConstraint(
            "horas_docente >= 0", name="ck_materia_horas_docente_no_negativas"
        ),
        sa.CheckConstraint(
            "horas_independientes >= 0",
            name="ck_materia_horas_independientes_no_negativas",
        ),
        sa.CheckConstraint(
            "seriacion_materia_id IS NULL OR seriacion_materia_id <> id",
            name="ck_materia_no_auto_seriacion",
        ),
    )
    op.create_index("ix_materia_carrera_tipo", "materia", ["carrera_id", "tipo"])
    op.create_index(
        "ix_materia_seriacion_materia_id", "materia", ["seriacion_materia_id"]
    )

    # --- semestre_elemento -----------------------------------------------------
    tipo_elemento = postgresql.ENUM(
        "MATERIA", "ESPACIO_OPTATIVO", name="tipo_elemento", create_type=False
    )
    tipo_elemento.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "semestre_elemento",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "semestre_id",
            sa.BigInteger(),
            sa.ForeignKey("semestre.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", tipo_elemento, nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column(
            "materia_id",
            sa.BigInteger(),
            sa.ForeignKey("materia.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("nombre", sa.String(250), nullable=True),
        sa.Column("horas_docente", sa.Integer(), nullable=True),
        sa.Column("horas_independientes", sa.Integer(), nullable=True),
        sa.Column(
            "creditos",
            sa.Numeric(6, 2),
            sa.Computed(
                "CASE WHEN horas_docente IS NULL OR horas_independientes IS NULL "
                "THEN NULL ELSE (horas_docente + horas_independientes)::numeric / 16 END",
                persisted=True,
            ),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "(tipo = 'MATERIA' AND materia_id IS NOT NULL AND nombre IS NULL "
            "AND horas_docente IS NULL AND horas_independientes IS NULL) OR "
            "(tipo = 'ESPACIO_OPTATIVO' AND materia_id IS NULL AND nombre IS NOT NULL "
            "AND horas_docente IS NOT NULL AND horas_independientes IS NOT NULL)",
            name="ck_semestre_elemento_discriminador",
        ),
        sa.CheckConstraint("orden >= 0", name="ck_semestre_elemento_orden_no_negativo"),
    )
    op.create_index(
        "ix_semestre_elemento_semestre_orden", "semestre_elemento", ["semestre_id", "orden"]
    )
    op.create_index(
        "ux_semestre_elemento_materia",
        "semestre_elemento",
        ["materia_id"],
        unique=True,
        postgresql_where=sa.text("materia_id IS NOT NULL"),
    )

    # --- usuario ---------------------------------------------------------------
    rol_usuario = postgresql.ENUM(
        "USUARIO", "DIRECTOR", "ADMIN", name="rol_usuario", create_type=False
    )
    rol_usuario.create(op.get_bind(), checkfirst=True)
    auth_provider = postgresql.ENUM(
        "LOCAL", "SSO", name="auth_provider", create_type=False
    )
    auth_provider.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "usuario",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("rol", rol_usuario, nullable=False),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "auth_provider", auth_provider, nullable=False, server_default="LOCAL"
        ),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("ultimo_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "rol = 'ADMIN' OR carrera_id IS NOT NULL",
            name="ck_usuario_rol_requiere_carrera",
        ),
        sa.CheckConstraint(
            "auth_provider <> 'LOCAL' OR password_hash IS NOT NULL",
            name="ck_usuario_local_requiere_password",
        ),
    )
    op.create_index(
        "ux_usuario_auth_provider_external_id",
        "usuario",
        ["auth_provider", "external_id"],
        unique=True,
        postgresql_where=sa.text("external_id IS NOT NULL"),
    )

    # --- refresh_token -----------------------------------------------------
    op.create_table(
        "refresh_token",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.BigInteger(),
            sa.ForeignKey("usuario.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # --- auditoria -------------------------------------------------------------
    op.create_table(
        "auditoria",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.BigInteger(),
            sa.ForeignKey("usuario.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("accion", sa.String(60), nullable=False),
        sa.Column("entidad", sa.String(60), nullable=False),
        sa.Column("entidad_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("datos_antes", postgresql.JSONB(), nullable=True),
        sa.Column("datos_despues", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_auditoria_carrera_created", "auditoria", ["carrera_id", "created_at"]
    )
    op.create_index("ix_auditoria_entidad", "auditoria", ["entidad", "entidad_id"])

    # --- vista de totales por semestre -----------------------------------------
    op.execute(
        """
        CREATE VIEW v_semestre_totales AS
        SELECT
            s.id AS semestre_id,
            COALESCE(SUM(
                CASE WHEN se.tipo = 'MATERIA' THEN m.creditos ELSE se.creditos END
            ), 0) AS total_creditos,
            COALESCE(SUM(
                CASE WHEN se.tipo = 'MATERIA' THEN m.horas_docente ELSE se.horas_docente END
            ), 0) AS total_horas_docente,
            COALESCE(SUM(
                CASE WHEN se.tipo = 'MATERIA' THEN m.horas_independientes ELSE se.horas_independientes END
            ), 0) AS total_horas_independientes,
            COUNT(se.id) AS num_elementos
        FROM semestre s
        LEFT JOIN semestre_elemento se ON se.semestre_id = s.id
        LEFT JOIN materia m ON m.id = se.materia_id
        GROUP BY s.id
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_semestre_totales")

    op.drop_table("auditoria")
    op.drop_table("refresh_token")
    op.drop_table("usuario")
    op.drop_table("semestre_elemento")
    op.drop_table("materia")
    op.drop_table("semestre")
    op.drop_table("carrera")

    op.execute("DROP TYPE IF EXISTS auth_provider")
    op.execute("DROP TYPE IF EXISTS rol_usuario")
    op.execute("DROP TYPE IF EXISTS tipo_elemento")
    op.execute("DROP TYPE IF EXISTS tipo_materia")
