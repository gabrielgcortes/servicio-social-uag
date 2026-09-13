"""Modelo SemestreElemento: ítem posicionado dentro de un semestre.

Discriminador `tipo`:
- MATERIA           -> referencia a una Materia real del catálogo (materia_id).
- ESPACIO_OPTATIVO  -> espacio del mapa curricular sin materia concreta
                       (p. ej. "Optativa de formación profesional 3"),
                       con nombre y horas propias.

Un único campo `orden` por semestre habilita drag & drop simple (reordenar y
mover entre semestres son la misma operación sobre esta tabla).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Computed, ForeignKey, Index, Integer, Numeric, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import TipoElemento

if TYPE_CHECKING:
    from app.models.materia import Materia
    from app.models.semestre import Semestre


class SemestreElemento(Base, TimestampMixin):
    __tablename__ = "semestre_elemento"
    __table_args__ = (
        CheckConstraint(
            "(tipo = 'MATERIA' AND materia_id IS NOT NULL AND nombre IS NULL "
            "AND horas_docente IS NULL AND horas_independientes IS NULL) OR "
            "(tipo = 'ESPACIO_OPTATIVO' AND materia_id IS NULL AND nombre IS NOT NULL "
            "AND horas_docente IS NOT NULL AND horas_independientes IS NOT NULL)",
            name="ck_semestre_elemento_discriminador",
        ),
        CheckConstraint("orden >= 0", name="ck_semestre_elemento_orden_no_negativo"),
        Index("ix_semestre_elemento_semestre_orden", "semestre_id", "orden"),
        Index(
            "ux_semestre_elemento_materia",
            "materia_id",
            unique=True,
            postgresql_where=text("materia_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    semestre_id: Mapped[int] = mapped_column(
        ForeignKey("semestre.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[TipoElemento] = mapped_column(
        SAEnum(TipoElemento, name="tipo_elemento", native_enum=True), nullable=False
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False)

    materia_id: Mapped[int | None] = mapped_column(
        ForeignKey("materia.id", ondelete="CASCADE"), nullable=True
    )
    nombre: Mapped[str | None] = mapped_column(String(250), nullable=True)
    horas_docente: Mapped[int | None] = mapped_column(Integer, nullable=True)
    horas_independientes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    creditos: Mapped[float | None] = mapped_column(
        Numeric(6, 2),
        Computed(
            "CASE WHEN horas_docente IS NULL OR horas_independientes IS NULL THEN NULL "
            "ELSE (horas_docente + horas_independientes)::numeric / 16 END",
            persisted=True,
        ),
    )

    semestre: Mapped["Semestre"] = relationship(back_populates="elementos")
    materia: Mapped["Materia | None"] = relationship(back_populates="elementos_mapa")
