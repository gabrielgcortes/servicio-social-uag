"""Versiones de reglas cuantitativas aplicables a un plan curricular."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.plan_curricular import PlanCurricular


class ConfiguracionReglasPlan(Base, TimestampMixin):
    __tablename__ = "configuracion_reglas_plan"
    __table_args__ = (
        UniqueConstraint("plan_curricular_id", "version", name="uq_config_reglas_plan_version"),
        Index("ux_config_reglas_vigente", "plan_curricular_id", unique=True, postgresql_where=text("vigente")),
        CheckConstraint("version > 0", name="ck_config_reglas_version_positiva"),
        CheckConstraint("duracion_ciclo_semanas > 0", name="ck_config_duracion_positiva"),
        CheckConstraint("ciclos_esperados > 0", name="ck_config_ciclos_positivos"),
        CheckConstraint("max_creditos_ciclo > 0", name="ck_config_max_creditos_positivo"),
        CheckConstraint("min_creditos_plan IS NULL OR max_creditos_plan IS NULL OR min_creditos_plan <= max_creditos_plan", name="ck_config_rango_creditos_plan"),
        CheckConstraint("practicas_min_periodos <= practicas_max_periodos", name="ck_config_rango_periodos_practicas"),
        CheckConstraint("practicas_min_horas <= practicas_max_horas", name="ck_config_rango_horas_practicas"),
        CheckConstraint("practicas_min_creditos <= practicas_max_creditos", name="ck_config_rango_creditos_practicas"),
        CheckConstraint("capstone_min <= capstone_max", name="ck_config_rango_capstone"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    plan_curricular_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("plan_curricular.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    vigente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    vigente_desde: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    duracion_ciclo_semanas: Mapped[int] = mapped_column(Integer, nullable=False)
    ciclos_esperados: Mapped[int] = mapped_column(Integer, nullable=False)
    max_creditos_ciclo: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False, default=50)
    max_materias_ciclo: Mapped[int | None] = mapped_column(Integer)
    min_creditos_plan: Mapped[float | None] = mapped_column(Numeric(8, 2))
    max_creditos_plan: Mapped[float | None] = mapped_column(Numeric(8, 2))
    min_horas_plan: Mapped[int | None] = mapped_column(Integer)
    multiplo_horas: Mapped[int] = mapped_column(Integer, nullable=False)
    materias_por_ciclo: Mapped[int | None] = mapped_column(Integer)
    prohibir_seriacion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    optativa_min_horas_docente: Mapped[int | None] = mapped_column(Integer)
    optativa_min_horas_independientes: Mapped[int | None] = mapped_column(Integer)
    practicas_min_periodos: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    practicas_max_periodos: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    practicas_min_horas: Mapped[int] = mapped_column(Integer, nullable=False, default=320)
    practicas_max_horas: Mapped[int] = mapped_column(Integer, nullable=False, default=1280)
    practicas_min_creditos: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False, default=20)
    practicas_max_creditos: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False, default=80)
    capstone_min: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    capstone_max: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    horas_docente_estandar: Mapped[int | None] = mapped_column(Integer)
    horas_independientes_estandar: Mapped[int | None] = mapped_column(Integer)
    creditos_estandar: Mapped[float | None] = mapped_column(Numeric(7, 2))
    # Reglas nominales y materias de nucleo permanecen configurables sin
    # forzar una migracion por cada cambio institucional.
    reglas_adicionales: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

    plan_curricular: Mapped["PlanCurricular"] = relationship(back_populates="configuraciones_reglas")
