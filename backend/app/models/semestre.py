"""Modelo Semestre: pertenece a una carrera; contiene elementos ordenados."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.carrera import Carrera
    from app.models.semestre_elemento import SemestreElemento


class Semestre(Base, TimestampMixin):
    __tablename__ = "semestre"
    __table_args__ = (
        UniqueConstraint("carrera_id", "numero", name="uq_semestre_carrera_numero"),
        CheckConstraint("numero BETWEEN 1 AND 20", name="ck_semestre_numero_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    carrera_id: Mapped[int] = mapped_column(
        ForeignKey("carrera.id", ondelete="CASCADE"), nullable=False
    )
    numero: Mapped[int] = mapped_column(Integer, nullable=False)

    carrera: Mapped["Carrera"] = relationship(back_populates="semestres")
    elementos: Mapped[list["SemestreElemento"]] = relationship(
        back_populates="semestre",
        cascade="all, delete-orphan",
        order_by="SemestreElemento.orden",
    )
