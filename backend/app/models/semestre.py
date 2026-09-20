"""Modelo Semestre: pertenece a un plan y contiene elementos ordenados."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.plan_curricular import PlanCurricular
    from app.models.semestre_elemento import SemestreElemento


class Semestre(Base, TimestampMixin):
    __tablename__ = "semestre"
    __table_args__ = (
        UniqueConstraint("plan_curricular_id", "numero", name="uq_semestre_plan_numero"),
        CheckConstraint("numero BETWEEN 1 AND 20", name="ck_semestre_numero_rango"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    plan_curricular_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("plan_curricular.id", ondelete="CASCADE"), nullable=False
    )
    numero: Mapped[int] = mapped_column(Integer, nullable=False)

    plan_curricular: Mapped["PlanCurricular"] = relationship(back_populates="semestres")
    elementos: Mapped[list["SemestreElemento"]] = relationship(
        back_populates="semestre",
        cascade="all, delete-orphan",
        order_by="SemestreElemento.orden",
    )
