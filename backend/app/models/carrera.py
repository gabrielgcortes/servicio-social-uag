"""Modelo Carrera: raíz del árbol Carrera -> Semestre -> SemestreElemento."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.materia import Materia
    from app.models.semestre import Semestre
    from app.models.usuario import Usuario


class Carrera(Base, TimestampMixin):
    __tablename__ = "carrera"
    __table_args__ = (
        CheckConstraint("max_creditos_semestre > 0", name="ck_carrera_max_creditos_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    max_creditos_semestre: Mapped[int] = mapped_column(
        Integer, default=50, server_default="50", nullable=False
    )

    semestres: Mapped[list["Semestre"]] = relationship(
        back_populates="carrera", cascade="all, delete-orphan", order_by="Semestre.numero"
    )
    materias: Mapped[list["Materia"]] = relationship(
        back_populates="carrera", cascade="all, delete-orphan"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="carrera")
