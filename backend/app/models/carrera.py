"""Modelo Carrera: identidad permanente que agrupa versiones de planes."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.plan_curricular import PlanCurricular
    from app.models.usuario import Usuario


class Carrera(Base, TimestampMixin):
    __tablename__ = "carrera"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    clave: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    planes: Mapped[list["PlanCurricular"]] = relationship(
        back_populates="carrera", cascade="all, delete-orphan"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary="usuario_carrera", back_populates="carreras"
    )
