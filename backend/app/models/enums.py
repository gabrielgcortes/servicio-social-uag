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


class EstadoPlanCurricular(str, enum.Enum):
    BORRADOR = "BORRADOR"
    VIGENTE = "VIGENTE"
    HISTORICO = "HISTORICO"


class AuthProvider(str, enum.Enum):
    LOCAL = "LOCAL"
    SSO = "SSO"


class NivelAcademico(str, enum.Enum):
    LICENCIATURA = "LICENCIATURA"
    ESPECIALIDAD = "ESPECIALIDAD"
    MAESTRIA = "MAESTRIA"
    DOCTORADO = "DOCTORADO"


class ModalidadPrograma(str, enum.Enum):
    ESCOLARIZADA = "ESCOLARIZADA"
    NO_ESCOLARIZADA = "NO_ESCOLARIZADA"
    MIXTA = "MIXTA"


class Decanato(str, enum.Enum):
    DISENO_CIENCIA_TECNOLOGIA = "DISENO_CIENCIA_TECNOLOGIA"
    CIENCIAS_SOCIALES_ECONOMICAS_ADMINISTRATIVAS = (
        "CIENCIAS_SOCIALES_ECONOMICAS_ADMINISTRATIVAS"
    )
    OTRO = "OTRO"


class TipoReconocimiento(str, enum.Enum):
    FEDERAL = "FEDERAL"
    ESTATAL = "ESTATAL"


class AreaFormacion(str, enum.Enum):
    UNIVERSITARIA = "UNIVERSITARIA"
    BASICA = "BASICA"
    DISCIPLINAR = "DISCIPLINAR"
    PROFESIONAL = "PROFESIONAL"
    FUNDAMENTAL = "FUNDAMENTAL"
    TERMINAL_INVESTIGACION = "TERMINAL_INVESTIGACION"


class TipoAula(str, enum.Enum):
    AULA = "A"
    LABORATORIO = "L"
    OTRO = "O"


class TipoExcepcion(str, enum.Enum):
    OPTATIVA_HORAS_MINIMAS = "OPTATIVA_HORAS_MINIMAS"
    NUMERO_CICLOS = "NUMERO_CICLOS"
    REGLA_CUANTITATIVA = "REGLA_CUANTITATIVA"
