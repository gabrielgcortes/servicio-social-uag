"""Modelo Materia: catálogo real de una carrera (obligatorias y optativas)."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Computed, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import TipoMateria

if TYPE_CHECKING:
    from app.models.carrera import Carrera
    from app.models.semestre_elemento import SemestreElemento


class Materia(Base, TimestampMixin):
    __tablename__ = "materia"
    __table_args__ = (
        UniqueConstraint("carrera_id", "clave", name="uq_materia_carrera_clave"),
        CheckConstraint("horas_docente >= 0", name="ck_materia_horas_docente_no_negativas"),
        CheckConstraint(
            "horas_independientes >= 0", name="ck_materia_horas_independientes_no_negativas"
        ),
        CheckConstraint(
            "seriacion_materia_id IS NULL OR seriacion_materia_id <> id",
            name="ck_materia_no_auto_seriacion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    carrera_id: Mapped[int] = mapped_column(
        ForeignKey("carrera.id", ondelete="CASCADE"), nullable=False
    )
    clave: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    horas_docente: Mapped[int] = mapped_column(Integer, nullable=False)
    horas_independientes: Mapped[int] = mapped_column(Integer, nullable=False)
    # Fuente de verdad del cálculo: columna generada por Postgres (ver services/creditos.py
    # para el espejo en Python usado en previews/validación antes de persistir).
    creditos: Mapped[float] = mapped_column(
        Numeric(6, 2),
        Computed("(horas_docente + horas_independientes)::numeric / 16", persisted=True),
    )
    instalaciones: Mapped[str | None] = mapped_column(String(200), nullable=True)
    modalidad: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tipo: Mapped[TipoMateria] = mapped_column(
        SAEnum(TipoMateria, name="tipo_materia", native_enum=True), nullable=False
    )
    seriacion_materia_id: Mapped[int | None] = mapped_column(
        ForeignKey("materia.id", ondelete="SET NULL"), nullable=True
    )
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    carrera: Mapped["Carrera"] = relationship(back_populates="materias")
    seriacion: Mapped["Materia | None"] = relationship(remote_side="Materia.id")
    elementos_mapa: Mapped[list["SemestreElemento"]] = relationship(back_populates="materia")
