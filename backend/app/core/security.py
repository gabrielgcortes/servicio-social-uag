"""Hashing de contraseñas (Argon2id vía pwdlib) y emisión/verificación de JWT."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

settings = get_settings()
_password_hasher = PasswordHash.recommended()  # argon2id


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hasher.verify(password, password_hash)


def create_access_token(*, subject: int) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Lanza jwt.PyJWTError (o subclases) si el token es inválido o expiró."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    # No requiere Argon2 (no es una contraseña de usuario): es un secreto de alta
    # entropía generado por el servidor; SHA-256 alcanza para detectar reuso/robo.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
