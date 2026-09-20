"""Principal: representación neutra del usuario autenticado, independiente
del mecanismo de autenticación (local hoy, SSO institucional mañana).
Toda la autorización (policies.py) depende únicamente de este objeto."""
from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import RolUsuario


@dataclass(frozen=True)
class Principal:
    usuario_id: int
    rol: RolUsuario
    activo: bool
