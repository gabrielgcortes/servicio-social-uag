"""Catálogo institucional ordenado de optativas para licenciatura."""
from sqlalchemy import BigInteger, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class OptativaInstitucional(Base, TimestampMixin):
    __tablename__ = "optativa_institucional"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False, unique=True)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

