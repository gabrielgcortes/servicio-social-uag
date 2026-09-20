"""Configuración versionada y autorizaciones de excepción."""
from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.autorizacion_excepcion import AutorizacionExcepcion
from app.models.configuracion_reglas import ConfiguracionReglasPlan
from app.models.enums import Decanato, ModalidadPrograma, NivelAcademico, TipoExcepcion
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.schemas.autorizacion_excepcion import AutorizacionExcepcionCreate
from app.schemas.plan_curricular import ConfiguracionReglasCreate
from app.services import audit


_ORDEN_DCT = [
    (1, "Inmersión a la profesión y su contexto"),
    (2, "Lógica y filosofía de la ciencia"),
    (4, "Lengua extranjera I"),
    (4, "Antropología filosófica"),
    (5, "Lengua extranjera II"),
    (5, "Laboratorio de innovación"),
    (6, "Bioética"),
    (7, "Laboratorio de emprendimiento"),
]
_ORDEN_CSEA = [
    (1, "Inmersión a la profesión y su contexto"),
    (3, "Lógica y filosofía de la ciencia"),
    (4, "Lengua extranjera I"),
    (4, "Laboratorio de innovación"),
    (5, "Lengua extranjera II"),
    (5, "Antropología filosófica"),
    (6, "Laboratorio de emprendimiento"),
    (7, "Ética profesional"),
]


def valores_predeterminados(plan: PlanCurricular) -> dict:
    nivel = plan.nivel_academico
    modalidad = plan.modalidad
    comunes = dict(
        version=1,
        vigente=True,
        max_creditos_ciclo=plan.max_creditos_semestre,
        practicas_min_periodos=2,
        practicas_max_periodos=5,
        practicas_min_horas=320,
        practicas_max_horas=1280,
        practicas_min_creditos=20,
        practicas_max_creditos=80,
        capstone_min=2,
        capstone_max=2,
        materias_por_ciclo=None,
        horas_docente_estandar=None,
        horas_independientes_estandar=None,
        creditos_estandar=None,
    )
    requeridas = []
    if nivel == NivelAcademico.LICENCIATURA:
        if plan.decanato == Decanato.DISENO_CIENCIA_TECNOLOGIA:
            requeridas = _ORDEN_DCT
        elif plan.decanato == Decanato.CIENCIAS_SOCIALES_ECONOMICAS_ADMINISTRATIVAS:
            requeridas = _ORDEN_CSEA
        comunes.update(
            duracion_ciclo_semanas=16,
            ciclos_esperados=8,
            max_materias_ciclo=5 if modalidad == ModalidadPrograma.NO_ESCOLARIZADA else 7,
            min_creditos_plan=300,
            max_creditos_plan=400,
            min_horas_plan=4800,
            multiplo_horas=16,
            prohibir_seriacion=modalidad == ModalidadPrograma.NO_ESCOLARIZADA,
            optativa_min_horas_docente=64 if modalidad == ModalidadPrograma.NO_ESCOLARIZADA else 32,
            optativa_min_horas_independientes=80 if modalidad == ModalidadPrograma.NO_ESCOLARIZADA else 64,
        )
    elif nivel == NivelAcademico.ESPECIALIDAD:
        comunes.update(duracion_ciclo_semanas=14, ciclos_esperados=3, max_materias_ciclo=None, min_creditos_plan=45, max_creditos_plan=54, min_horas_plan=720, multiplo_horas=14, prohibir_seriacion=False, optativa_min_horas_docente=None, optativa_min_horas_independientes=None)
    elif nivel == NivelAcademico.MAESTRIA:
        requeridas = [(1, "Liderazgo innovador para el desarrollo profesional"), (6, "Proyecto aplicado")]
        comunes.update(duracion_ciclo_semanas=14, ciclos_esperados=6, max_materias_ciclo=2, min_creditos_plan=75, max_creditos_plan=108, min_horas_plan=1200, multiplo_horas=14, materias_por_ciclo=2, prohibir_seriacion=False, optativa_min_horas_docente=None, optativa_min_horas_independientes=None, horas_docente_estandar=14, horas_independientes_estandar=130, creditos_estandar=9)
    else:
        comunes.update(duracion_ciclo_semanas=14, ciclos_esperados=6, max_materias_ciclo=None, min_creditos_plan=150, max_creditos_plan=None, min_horas_plan=2400, multiplo_horas=14, prohibir_seriacion=False, optativa_min_horas_docente=None, optativa_min_horas_independientes=None)
    comunes["reglas_adicionales"] = {
        "materias_requeridas": [{"ciclo": ciclo, "nombre": nombre} for ciclo, nombre in requeridas],
        "materias_nucleo": [],
    }
    return comunes


def crear_inicial(db: Session, plan: PlanCurricular) -> ConfiguracionReglasPlan:
    config = ConfiguracionReglasPlan(plan_curricular_id=plan.id, **valores_predeterminados(plan))
    db.add(config)
    db.flush()
    return config


def listar(db: Session, plan_id: int) -> list[ConfiguracionReglasPlan]:
    return list(db.execute(select(ConfiguracionReglasPlan).where(ConfiguracionReglasPlan.plan_curricular_id == plan_id).order_by(ConfiguracionReglasPlan.version)).scalars())


def crear_version(
    db: Session,
    plan: PlanCurricular,
    payload: ConfiguracionReglasCreate,
    *,
    actor_id: int | None = None,
    usar_predeterminados: bool = False,
) -> ConfiguracionReglasPlan:
    versiones = listar(db, plan.id)
    base = next((c for c in reversed(versiones) if c.vigente), None)
    valores = valores_predeterminados(plan) if base is None or usar_predeterminados else {
        columna.name: getattr(base, columna.name)
        for columna in ConfiguracionReglasPlan.__table__.columns
        if columna.name not in {"id", "plan_curricular_id", "version", "vigente", "vigente_desde", "created_at", "updated_at"}
    }
    cambios = payload.model_dump(exclude_unset=True)
    no_nulos = {
        "duracion_ciclo_semanas", "ciclos_esperados", "max_creditos_ciclo",
        "multiplo_horas", "prohibir_seriacion", "practicas_min_periodos",
        "practicas_max_periodos", "practicas_min_horas", "practicas_max_horas",
        "practicas_min_creditos", "practicas_max_creditos", "capstone_min",
        "capstone_max", "reglas_adicionales",
    }
    nulos_invalidos = sorted(campo for campo in cambios if campo in no_nulos and cambios[campo] is None)
    if nulos_invalidos:
        raise BusinessRuleError(f"Los campos {', '.join(nulos_invalidos)} no pueden ser nulos")
    valores.pop("version", None)
    valores.pop("vigente", None)
    valores.update(cambios)
    for minimo, maximo in (
        ("min_creditos_plan", "max_creditos_plan"),
        ("practicas_min_periodos", "practicas_max_periodos"),
        ("practicas_min_horas", "practicas_max_horas"),
        ("practicas_min_creditos", "practicas_max_creditos"),
        ("capstone_min", "capstone_max"),
    ):
        if valores.get(minimo) is not None and valores.get(maximo) is not None and valores[minimo] > valores[maximo]:
            raise BusinessRuleError(f"{minimo} no puede ser mayor que {maximo}")
    version = max((c.version for c in versiones), default=0) + 1
    for anterior in versiones:
        anterior.vigente = False
    db.flush()
    config = ConfiguracionReglasPlan(plan_curricular_id=plan.id, version=version, vigente=True, **valores)
    db.add(config)
    db.flush()
    plan.max_creditos_semestre = int(float(config.max_creditos_ciclo))
    audit.registrar(db, usuario_id=actor_id, accion="configuracion_reglas_versionada", entidad="configuracion_reglas_plan", entidad_id=config.id, carrera_id=plan.carrera_id, plan_curricular_id=plan.id, datos_despues={"version": version, **cambios})
    db.commit()
    db.refresh(config)
    return config


def crear_autorizacion(db: Session, plan: PlanCurricular, payload: AutorizacionExcepcionCreate, *, actor_id: int | None = None) -> AutorizacionExcepcion:
    if payload.tipo == TipoExcepcion.OPTATIVA_HORAS_MINIMAS and payload.materia_id is None:
        raise BusinessRuleError("La excepción de horas optativas requiere materia_id")
    if payload.materia_id is not None:
        materia = db.get(Materia, payload.materia_id)
        if materia is None:
            raise NotFoundError("Materia no encontrada")
        if materia.plan_curricular_id != plan.id:
            raise BusinessRuleError("La materia de la excepción debe pertenecer al plan")
    autorizacion = AutorizacionExcepcion(plan_curricular_id=plan.id, **payload.model_dump())
    db.add(autorizacion)
    db.flush()
    audit.registrar(db, usuario_id=actor_id, accion="excepcion_autorizada", entidad="autorizacion_excepcion", entidad_id=autorizacion.id, carrera_id=plan.carrera_id, plan_curricular_id=plan.id, datos_despues={"tipo": autorizacion.tipo.value, "materia_id": autorizacion.materia_id, "motivo": autorizacion.motivo, "responsable": autorizacion.responsable})
    db.commit()
    db.refresh(autorizacion)
    return autorizacion


def listar_autorizaciones(db: Session, plan_id: int) -> list[AutorizacionExcepcion]:
    return list(db.execute(select(AutorizacionExcepcion).where(AutorizacionExcepcion.plan_curricular_id == plan_id).order_by(AutorizacionExcepcion.autorizada_en.desc())).scalars())


def revocar_autorizacion(db: Session, plan: PlanCurricular, autorizacion_id: int, *, actor_id: int | None = None) -> None:
    autorizacion = db.get(AutorizacionExcepcion, autorizacion_id)
    if autorizacion is None or autorizacion.plan_curricular_id != plan.id:
        raise NotFoundError("Autorización de excepción no encontrada")
    autorizacion.activa = False
    audit.registrar(db, usuario_id=actor_id, accion="excepcion_revocada", entidad="autorizacion_excepcion", entidad_id=autorizacion.id, carrera_id=plan.carrera_id, plan_curricular_id=plan.id, datos_antes={"activa": True}, datos_despues={"activa": False})
    db.commit()
