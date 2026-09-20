"""Modelo Auditoria: registro inmutable de mutaciones relevantes (poblado por services/)."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = (
        Index("ix_auditoria_carrera_created", "carrera_id", "created_at"),
        Index("ix_auditoria_plan_created", "plan_curricular_id", "created_at"),
        Index("ix_auditoria_entidad", "entidad", "entidad_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("usuario.id", ondelete="SET NULL"), nullable=True
    )
    accion: Mapped[str] = mapped_column(String(60), nullable=False)
    entidad: Mapped[str] = mapped_column(String(60), nullable=False)
    entidad_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    carrera_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("carrera.id", ondelete="SET NULL"), nullable=True
    )
    plan_curricular_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("plan_curricular.id", ondelete="SET NULL"), nullable=True
    )
    datos_antes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    datos_despues: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    usuario: Mapped["Usuario | None"] = relationship()
