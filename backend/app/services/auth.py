"""Orquesta login, emisión/rotación de refresh tokens, logout y cambio de
contraseña. Única capa (junto con el resto de services/) que hace commit."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth.providers import LocalAuthProvider
from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.repositories import refresh_token as refresh_token_repo
from app.repositories import usuario as usuario_repo

settings = get_settings()
_local_provider = LocalAuthProvider()


def login(db: Session, email: str, password: str) -> tuple[str, str, Usuario]:
    """Devuelve (access_token, refresh_token_plano, usuario)."""
    user = _local_provider.authenticate(db, email, password)
    if user is None:
        raise UnauthorizedError("Credenciales inválidas")

    user.ultimo_login_at = datetime.now(timezone.utc)
    access_token = _issue_access_token(user)
    refresh_plain = _issue_refresh_token(db, user.id)
    db.commit()
    return access_token, refresh_plain, user


def refresh(db: Session, refresh_token_plain: str) -> tuple[str, str]:
    """Rota el refresh token; devuelve (nuevo_access_token, nuevo_refresh_token)."""
    token_hash = hash_refresh_token(refresh_token_plain)
    token = refresh_token_repo.get_by_hash(db, token_hash)
    now = datetime.now(timezone.utc)
    if token is None or token.revoked_at is not None or token.expires_at < now:
        raise UnauthorizedError("Refresh token inválido o expirado")

    user = usuario_repo.get_by_id(db, token.usuario_id)
    if user is None or not user.activo:
        raise UnauthorizedError("Usuario inválido o inactivo")

    refresh_token_repo.revoke(token)  # rotación: el token usado queda inválido
    access_token = _issue_access_token(user)
    new_refresh_plain = _issue_refresh_token(db, user.id)
    db.commit()
    return access_token, new_refresh_plain


def logout(db: Session, refresh_token_plain: str) -> None:
    token_hash = hash_refresh_token(refresh_token_plain)
    token = refresh_token_repo.get_by_hash(db, token_hash)
    if token is not None and token.revoked_at is None:
        refresh_token_repo.revoke(token)
        db.commit()


def change_password(
    db: Session, user: Usuario, password_actual: str, password_nueva: str
) -> None:
    if user.password_hash is None or not verify_password(password_actual, user.password_hash):
        raise UnauthorizedError("La contraseña actual no es correcta")
    user.password_hash = hash_password(password_nueva)
    # Fuerza a reautenticarse en el resto de dispositivos/pestañas.
    refresh_token_repo.revoke_all_for_usuario(db, user.id)
    db.commit()


def _issue_access_token(user: Usuario) -> str:
    return create_access_token(subject=user.id)


def _issue_refresh_token(db: Session, usuario_id: int) -> str:
    plain = generate_refresh_token()
    refresh_token_repo.add(
        db,
        RefreshToken(
            usuario_id=usuario_id,
            token_hash=hash_refresh_token(plain),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_days),
        ),
    )
    return plain
