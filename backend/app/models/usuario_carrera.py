"""Tabla de asociación entre usuarios y las carreras que pueden consultar."""
from sqlalchemy import BigInteger, Column, ForeignKey, Index, Table

from app.db.base import Base


usuario_carrera = Table(
    "usuario_carrera",
    Base.metadata,
    Column(
        "usuario_id", BigInteger, ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "carrera_id", BigInteger, ForeignKey("carrera.id", ondelete="CASCADE"), primary_key=True
    ),
    Index("ix_usuario_carrera_carrera_id", "carrera_id"),
)
