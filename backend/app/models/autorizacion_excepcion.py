"""Autorizaciones explícitas para excepciones a reglas bloqueantes."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TipoExcepcion

if TYPE_CHECKING:
    from app.models.materia import Materia
    from app.models.plan_curricular import PlanCurricular


class AutorizacionExcepcion(Base):
    __tablename__ = "autorizacion_excepcion"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    plan_curricular_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("plan_curricular.id", ondelete="CASCADE"), nullable=False, index=True
    )
    materia_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("materia.id", ondelete="CASCADE"), nullable=True
    )
    tipo: Mapped[TipoExcepcion] = mapped_column(
        SAEnum(TipoExcepcion, name="tipo_excepcion", native_enum=True), nullable=False
    )
    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    responsable: Mapped[str] = mapped_column(String(200), nullable=False)
    autorizada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    plan_curricular: Mapped["PlanCurricular"] = relationship(back_populates="autorizaciones")
    materia: Mapped["Materia | None"] = relationship()

