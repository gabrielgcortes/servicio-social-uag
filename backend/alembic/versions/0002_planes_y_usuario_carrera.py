"""Agrega planes curriculares y asignaciones N:N de usuarios a carreras.

Revision ID: 0002_planes_usuario_carrera
Revises: 0001_initial
Create Date: 2026-09-12
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_planes_usuario_carrera"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    estado_plan = postgresql.ENUM(
        "BORRADOR", "VIGENTE", "HISTORICO", name="estado_plan_curricular", create_type=False
    )
    estado_plan.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "plan_curricular",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("clave", sa.String(40), nullable=False, unique=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("anio_inicio", sa.Integer(), nullable=True),
        sa.Column("vigente_desde", sa.Date(), nullable=True),
        sa.Column("vigente_hasta", sa.Date(), nullable=True),
        sa.Column("estado", estado_plan, nullable=False, server_default="BORRADOR"),
        sa.Column("max_creditos_semestre", sa.Integer(), nullable=False, server_default="50"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "max_creditos_semestre > 0", name="ck_plan_curricular_max_creditos_positivo"
        ),
        sa.CheckConstraint(
            "vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta >= vigente_desde",
            name="ck_plan_curricular_vigencia_valida",
        ),
    )
    op.create_index("ix_plan_curricular_carrera_id", "plan_curricular", ["carrera_id"])

    op.create_table(
        "usuario_carrera",
        sa.Column(
            "usuario_id",
            sa.BigInteger(),
            sa.ForeignKey("usuario.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "carrera_id",
            sa.BigInteger(),
            sa.ForeignKey("carrera.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_usuario_carrera_carrera_id", "usuario_carrera", ["carrera_id"])

    # Un snapshot legado por carrera conserva intacto el contenido existente.
    op.execute(
        """
        INSERT INTO plan_curricular (
            carrera_id, clave, descripcion, estado, max_creditos_semestre, created_at, updated_at
        )
        SELECT
            id,
            clave || '-LEGACY',
            'Plan migrado desde el esquema anterior',
            'VIGENTE',
            max_creditos_semestre,
            created_at,
            updated_at
        FROM carrera
        """
    )
    op.execute(
        """
        INSERT INTO usuario_carrera (usuario_id, carrera_id)
        SELECT id, carrera_id FROM usuario WHERE carrera_id IS NOT NULL
        """
    )

    op.add_column("semestre", sa.Column("plan_curricular_id", sa.BigInteger(), nullable=True))
    op.add_column("materia", sa.Column("plan_curricular_id", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE semestre s SET plan_curricular_id = p.id
        FROM plan_curricular p WHERE p.carrera_id = s.carrera_id
        """
    )
    op.execute(
        """
        UPDATE materia m SET plan_curricular_id = p.id
        FROM plan_curricular p WHERE p.carrera_id = m.carrera_id
        """
    )
    op.alter_column("semestre", "plan_curricular_id", nullable=False)
    op.alter_column("materia", "plan_curricular_id", nullable=False)
    op.create_foreign_key(
        "fk_semestre_plan_curricular",
        "semestre",
        "plan_curricular",
        ["plan_curricular_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_materia_plan_curricular",
        "materia",
        "plan_curricular",
        ["plan_curricular_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("uq_semestre_carrera_numero", "semestre", type_="unique")
    op.create_unique_constraint(
        "uq_semestre_plan_numero", "semestre", ["plan_curricular_id", "numero"]
    )
    op.drop_index("ix_materia_carrera_tipo", table_name="materia")
    op.drop_constraint("uq_materia_carrera_clave", "materia", type_="unique")
    op.create_unique_constraint(
        "uq_materia_plan_clave", "materia", ["plan_curricular_id", "clave"]
    )
    op.create_index(
        "ix_materia_plan_tipo", "materia", ["plan_curricular_id", "tipo"]
    )

    op.add_column("auditoria", sa.Column("plan_curricular_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_auditoria_plan_curricular",
        "auditoria",
        "plan_curricular",
        ["plan_curricular_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_auditoria_plan_created", "auditoria", ["plan_curricular_id", "created_at"]
    )

    op.drop_constraint("semestre_carrera_id_fkey", "semestre", type_="foreignkey")
    op.drop_column("semestre", "carrera_id")
    op.drop_constraint("materia_carrera_id_fkey", "materia", type_="foreignkey")
    op.drop_column("materia", "carrera_id")
    op.drop_constraint("ck_usuario_rol_requiere_carrera", "usuario", type_="check")
    op.drop_constraint("usuario_carrera_id_fkey", "usuario", type_="foreignkey")
    op.drop_column("usuario", "carrera_id")
    op.drop_constraint("ck_carrera_max_creditos_positivo", "carrera", type_="check")
    op.drop_column("carrera", "max_creditos_semestre")

    # Reglas entre tablas que una FK simple no puede expresar: la seriación y
    # los elementos del mapa nunca pueden cruzar planes curriculares.
    op.execute(
        """
        CREATE FUNCTION validar_materia_mismo_plan() RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'UPDATE' AND NEW.plan_curricular_id <> OLD.plan_curricular_id THEN
                RAISE EXCEPTION 'una materia no puede moverse a otro plan curricular';
            END IF;
            IF NEW.seriacion_materia_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM materia prerequisito
                WHERE prerequisito.id = NEW.seriacion_materia_id
                  AND prerequisito.plan_curricular_id = NEW.plan_curricular_id
            ) THEN
                RAISE EXCEPTION 'la seriacion debe pertenecer al mismo plan curricular';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_materia_mismo_plan
        BEFORE INSERT OR UPDATE OF plan_curricular_id, seriacion_materia_id ON materia
        FOR EACH ROW EXECUTE FUNCTION validar_materia_mismo_plan();

        CREATE FUNCTION validar_semestre_plan_inmutable() RETURNS trigger AS $$
        BEGIN
            IF NEW.plan_curricular_id <> OLD.plan_curricular_id THEN
                RAISE EXCEPTION 'un semestre no puede moverse a otro plan curricular';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_semestre_plan_inmutable
        BEFORE UPDATE OF plan_curricular_id ON semestre
        FOR EACH ROW EXECUTE FUNCTION validar_semestre_plan_inmutable();

        CREATE FUNCTION validar_elemento_mismo_plan() RETURNS trigger AS $$
        BEGIN
            IF NEW.materia_id IS NOT NULL AND NOT EXISTS (
                SELECT 1
                FROM semestre s
                JOIN materia m ON m.id = NEW.materia_id
                WHERE s.id = NEW.semestre_id
                  AND s.plan_curricular_id = m.plan_curricular_id
            ) THEN
                RAISE EXCEPTION 'la materia del elemento debe pertenecer al mismo plan curricular';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_elemento_mismo_plan
        BEFORE INSERT OR UPDATE OF semestre_id, materia_id ON semestre_elemento
        FOR EACH ROW EXECUTE FUNCTION validar_elemento_mismo_plan();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_elemento_mismo_plan ON semestre_elemento")
    op.execute("DROP FUNCTION IF EXISTS validar_elemento_mismo_plan")
    op.execute("DROP TRIGGER IF EXISTS trg_semestre_plan_inmutable ON semestre")
    op.execute("DROP FUNCTION IF EXISTS validar_semestre_plan_inmutable")
    op.execute("DROP TRIGGER IF EXISTS trg_materia_mismo_plan ON materia")
    op.execute("DROP FUNCTION IF EXISTS validar_materia_mismo_plan")

    op.add_column(
        "carrera",
        sa.Column("max_creditos_semestre", sa.Integer(), nullable=False, server_default="50"),
    )
    op.execute(
        """
        UPDATE carrera c SET max_creditos_semestre = p.max_creditos_semestre
        FROM plan_curricular p
        WHERE p.id = (
            SELECT p2.id FROM plan_curricular p2
            WHERE p2.carrera_id = c.id
            ORDER BY (p2.estado = 'VIGENTE') DESC, p2.id
            LIMIT 1
        )
        """
    )
    op.create_check_constraint(
        "ck_carrera_max_creditos_positivo", "carrera", "max_creditos_semestre > 0"
    )

    op.add_column("usuario", sa.Column("carrera_id", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE usuario u SET carrera_id = (
            SELECT MIN(uc.carrera_id) FROM usuario_carrera uc WHERE uc.usuario_id = u.id
        )
        """
    )
    op.create_foreign_key(
        "usuario_carrera_id_fkey",
        "usuario",
        "carrera",
        ["carrera_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_usuario_rol_requiere_carrera", "usuario", "rol = 'ADMIN' OR carrera_id IS NOT NULL"
    )

    op.add_column("semestre", sa.Column("carrera_id", sa.BigInteger(), nullable=True))
    op.add_column("materia", sa.Column("carrera_id", sa.BigInteger(), nullable=True))
    op.execute(
        """UPDATE semestre s SET carrera_id = p.carrera_id
        FROM plan_curricular p WHERE p.id = s.plan_curricular_id"""
    )
    op.execute(
        """UPDATE materia m SET carrera_id = p.carrera_id
        FROM plan_curricular p WHERE p.id = m.plan_curricular_id"""
    )
    op.alter_column("semestre", "carrera_id", nullable=False)
    op.alter_column("materia", "carrera_id", nullable=False)
    op.create_foreign_key(
        "semestre_carrera_id_fkey", "semestre", "carrera", ["carrera_id"], ["id"], ondelete="CASCADE"
    )
    op.create_foreign_key(
        "materia_carrera_id_fkey", "materia", "carrera", ["carrera_id"], ["id"], ondelete="CASCADE"
    )

    op.drop_index("ix_materia_plan_tipo", table_name="materia")
    op.drop_constraint("uq_materia_plan_clave", "materia", type_="unique")
    op.create_unique_constraint("uq_materia_carrera_clave", "materia", ["carrera_id", "clave"])
    op.create_index("ix_materia_carrera_tipo", "materia", ["carrera_id", "tipo"])
    op.drop_constraint("uq_semestre_plan_numero", "semestre", type_="unique")
    op.create_unique_constraint("uq_semestre_carrera_numero", "semestre", ["carrera_id", "numero"])

    op.drop_constraint("fk_materia_plan_curricular", "materia", type_="foreignkey")
    op.drop_column("materia", "plan_curricular_id")
    op.drop_constraint("fk_semestre_plan_curricular", "semestre", type_="foreignkey")
    op.drop_column("semestre", "plan_curricular_id")
    op.drop_index("ix_auditoria_plan_created", table_name="auditoria")
    op.drop_constraint("fk_auditoria_plan_curricular", "auditoria", type_="foreignkey")
    op.drop_column("auditoria", "plan_curricular_id")
    op.drop_index("ix_usuario_carrera_carrera_id", table_name="usuario_carrera")
    op.drop_table("usuario_carrera")
    op.drop_index("ix_plan_curricular_carrera_id", table_name="plan_curricular")
    op.drop_table("plan_curricular")
    op.execute("DROP TYPE IF EXISTS estado_plan_curricular")
