"""Versión independiente del mapa curricular de una carrera."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Date, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import EstadoPlanCurricular

if TYPE_CHECKING:
    from app.models.carrera import Carrera
    from app.models.materia import Materia
    from app.models.semestre import Semestre


class PlanCurricular(Base, TimestampMixin):
    __tablename__ = "plan_curricular"
    __table_args__ = (
        CheckConstraint(
            "max_creditos_semestre > 0", name="ck_plan_curricular_max_creditos_positivo"
        ),
        CheckConstraint(
            "vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta >= vigente_desde",
            name="ck_plan_curricular_vigencia_valida",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    carrera_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("carrera.id", ondelete="CASCADE"), nullable=False, index=True
    )
    clave: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    anio_inicio: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vigente_desde: Mapped[date | None] = mapped_column(Date, nullable=True)
    vigente_hasta: Mapped[date | None] = mapped_column(Date, nullable=True)
    estado: Mapped[EstadoPlanCurricular] = mapped_column(
        SAEnum(EstadoPlanCurricular, name="estado_plan_curricular", native_enum=True),
        default=EstadoPlanCurricular.BORRADOR,
        server_default=EstadoPlanCurricular.BORRADOR.value,
        nullable=False,
    )
    max_creditos_semestre: Mapped[int] = mapped_column(
        Integer, default=50, server_default="50", nullable=False
    )

    carrera: Mapped["Carrera"] = relationship(back_populates="planes")
    semestres: Mapped[list["Semestre"]] = relationship(
        back_populates="plan_curricular",
        cascade="all, delete-orphan",
        order_by="Semestre.numero",
    )
    materias: Mapped[list["Materia"]] = relationship(
        back_populates="plan_curricular", cascade="all, delete-orphan"
    )
