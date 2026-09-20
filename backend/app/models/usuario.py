"""Modelo Usuario: autenticación local hoy, con campos listos para SSO futuro."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Index, String, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AuthProvider, RolUsuario

if TYPE_CHECKING:
    from app.models.carrera import Carrera
    from app.models.refresh_token import RefreshToken


class Usuario(Base, TimestampMixin):
    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint(
            "auth_provider <> 'LOCAL' OR password_hash IS NOT NULL",
            name="ck_usuario_local_requiere_password",
        ),
        Index(
            "ux_usuario_auth_provider_external_id",
            "auth_provider",
            "external_id",
            unique=True,
            postgresql_where=text("external_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rol: Mapped[RolUsuario] = mapped_column(
        SAEnum(RolUsuario, name="rol_usuario", native_enum=True), nullable=False
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    auth_provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider, name="auth_provider", native_enum=True),
        default=AuthProvider.LOCAL,
        server_default=AuthProvider.LOCAL.value,
        nullable=False,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ultimo_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    carreras: Mapped[list["Carrera"]] = relationship(
        secondary="usuario_carrera", back_populates="usuarios"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )

    @property
    def carrera_ids(self) -> list[int]:
        return [carrera.id for carrera in self.carreras]
