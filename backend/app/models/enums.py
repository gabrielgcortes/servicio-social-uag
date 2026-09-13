"""Enumeraciones compartidas por los modelos de dominio."""
import enum


class RolUsuario(str, enum.Enum):
    USUARIO = "USUARIO"
    DIRECTOR = "DIRECTOR"
    ADMIN = "ADMIN"


class TipoMateria(str, enum.Enum):
    OBLIGATORIA = "OBLIGATORIA"
    OPTATIVA = "OPTATIVA"


class TipoElemento(str, enum.Enum):
    MATERIA = "MATERIA"
    ESPACIO_OPTATIVO = "ESPACIO_OPTATIVO"


class AuthProvider(str, enum.Enum):
    LOCAL = "LOCAL"
    SSO = "SSO"
