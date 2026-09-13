"""Proveedores de autenticación. LocalAuthProvider implementado hoy;
SsoAuthProvider queda como stub para cuando exista documentación del SSO
institucional — cambiar de proveedor no afecta roles, carreras ni policies."""
from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.enums import AuthProvider as AuthProviderEnum
from app.models.usuario import Usuario
from app.repositories import usuario as usuario_repo


class AuthProviderProtocol(Protocol):
    def authenticate(self, db: Session, email: str, password: str) -> Usuario | None: ...


class LocalAuthProvider:
    """Autenticación por email + password_hash (Argon2id)."""

    def authenticate(self, db: Session, email: str, password: str) -> Usuario | None:
        user = usuario_repo.get_by_email(db, email)
        if user is None or user.auth_provider != AuthProviderEnum.LOCAL:
            return None
        if not user.activo:
            return None
        if user.password_hash is None or not verify_password(password, user.password_hash):
            return None
        return user


class SsoAuthProvider:
    """Futura integración OIDC (Authorization Code + PKCE) contra el SSO
    institucional: validaría el id_token contra el JWKS del proveedor y
    resolvería el usuario local por (auth_provider='SSO', external_id=sub)."""

    def authenticate(self, db: Session, email: str, password: str) -> Usuario | None:
        raise NotImplementedError("SSO institucional aún no disponible")
