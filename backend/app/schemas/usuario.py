"""Schemas Pydantic de Usuario. UsuarioRead nunca expone password_hash."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import RolUsuario


class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: RolUsuario
    carrera_ids: list[int] = Field(default_factory=list)
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_fuerte(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("La contraseña debe tener al menos 10 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe incluir al menos una mayúscula")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe incluir al menos una minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe incluir al menos un dígito")
        return v

    @model_validator(mode="after")
    def rol_requiere_carrera(self) -> "UsuarioCreate":
        if self.rol != RolUsuario.ADMIN and not self.carrera_ids:
            raise ValueError("USUARIO y DIRECTOR deben tener al menos una carrera asignada")
        if len(self.carrera_ids) != len(set(self.carrera_ids)):
            raise ValueError("No se puede asignar una carrera más de una vez")
        return self


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    rol: RolUsuario | None = None
    carrera_ids: list[int] | None = None
    activo: bool | None = None


class UsuarioRead(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ultimo_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
