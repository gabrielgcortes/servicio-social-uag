"""Dependencias FastAPI para resolver el Principal autenticado a partir del JWT.
Ningún router debe importar core.security.decode_access_token directamente:
siempre a través de get_current_principal / require_roles."""
from __future__ import annotations

import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.enums import RolUsuario
from app.repositories import usuario as usuario_repo


def get_current_principal(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Falta el token de acceso")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Token inválido o expirado") from exc

    usuario_id = int(payload["sub"])
    # Se relee el usuario en cada request (en vez de confiar en los claims del
    # JWT) para que un cambio de rol/carrera/activo surta efecto de inmediato.
    user = usuario_repo.get_by_id(db, usuario_id)
    if user is None or not user.activo:
        raise UnauthorizedError("Usuario inválido o inactivo")

    return Principal(
        usuario_id=user.id, rol=user.rol, carrera_id=user.carrera_id, activo=user.activo
    )


def require_roles(*roles: RolUsuario):
    def _dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.rol not in roles:
            raise ForbiddenError("No tienes permisos para esta operación")
        return principal

    return _dependency
