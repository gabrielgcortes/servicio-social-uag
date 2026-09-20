"""Reglas de negocio de Materia: valida con el RuleEngine antes de confirmar.
Si hay alguna violación ERROR se hace rollback y se lanza BusinessRuleError;
las WARNING se devuelven junto con la materia sin bloquear la operación."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.enums import TipoAula, TipoMateria
from app.models.materia import Materia
from app.models.optativa_institucional import OptativaInstitucional
from app.repositories import materia as materia_repo
from app.rules.base import RuleScope, Severity
from app.rules.context import build_context
from app.rules.registry import crear_motor
from app.schemas.materia import MateriaCreate, MateriaUpdate
from app.services import audit

_motor = crear_motor()


def list_materias(db: Session, plan_id: int, *, tipo: TipoMateria | None = None) -> list[Materia]:
    return materia_repo.list_by_plan(db, plan_id, tipo=tipo)


def list_optativas_institucionales(db: Session) -> list[OptativaInstitucional]:
    return list(db.execute(select(OptativaInstitucional).where(OptativaInstitucional.activa.is_(True)).order_by(OptativaInstitucional.orden)).scalars())


def get_materia(db: Session, materia_id: int) -> Materia:
    materia = materia_repo.get_by_id(db, materia_id)
    if materia is None:
        raise NotFoundError("Materia no encontrada")
    return materia


def create_materia(
    db: Session, plan_id: int, payload: MateriaCreate, *, actor_id: int | None = None
) -> tuple[Materia, list[dict]]:
    if materia_repo.get_by_plan_clave(db, plan_id, payload.clave) is not None:
        raise ConflictError("Ya existe una materia con esa clave en este plan")

    _validar_seriacion(db, plan_id, payload.seriacion_materia_id)

    materia = Materia(
        plan_curricular_id=plan_id,
        clave=payload.clave,
        nombre=payload.nombre,
        horas_docente=payload.horas_docente,
        horas_independientes=payload.horas_independientes,
        instalaciones=payload.instalaciones,
        tipo_aula=payload.tipo_aula or (TipoAula(payload.instalaciones) if payload.instalaciones else None),
        modalidad=payload.modalidad,
        area_formacion=payload.area_formacion,
        aporte_sustancial=payload.aporte_sustancial,
        docente_sugerido=payload.docente_sugerido,
        programa_asignatura=payload.programa_asignatura,
        usa_numeracion_romana=payload.usa_numeracion_romana,
        es_capstone=payload.es_capstone,
        es_practica_profesional=payload.es_practica_profesional,
        es_topico_selecto=payload.es_topico_selecto,
        excepcion_horas_estandar=payload.excepcion_horas_estandar,
        ciclos_disponibles=payload.ciclos_disponibles,
        tipo=payload.tipo,
        seriacion_materia_id=payload.seriacion_materia_id,
        activa=payload.activa,
    )
    materia_repo.add(db, materia)
    audit_meta = {
        "accion": "materia_creada",
        "datos_despues": {"clave": materia.clave, "nombre": materia.nombre},
    }
    return _validar_y_confirmar(db, plan_id, materia, actor_id=actor_id, audit_meta=audit_meta)


def update_materia(
    db: Session, materia_id: int, payload: MateriaUpdate, *, actor_id: int | None = None
) -> tuple[Materia, list[dict]]:
    materia = get_materia(db, materia_id)
    campos = payload.model_fields_set
    auditables = {
        "clave", "nombre", "horas_docente", "horas_independientes", "instalaciones", "tipo_aula",
        "modalidad", "area_formacion", "aporte_sustancial", "docente_sugerido",
        "programa_asignatura", "usa_numeracion_romana", "es_capstone",
        "es_practica_profesional", "es_topico_selecto", "excepcion_horas_estandar",
        "ciclos_disponibles", "seriacion_materia_id", "tipo", "activa",
    }
    datos_antes = {
        campo: _serializar(getattr(materia, campo)) for campo in campos & auditables
    }

    if "clave" in campos and payload.clave != materia.clave:
        if materia_repo.get_by_plan_clave(db, materia.plan_curricular_id, payload.clave) is not None:
            raise ConflictError("Ya existe una materia con esa clave en este plan")
        materia.clave = payload.clave
    if "nombre" in campos:
        materia.nombre = payload.nombre
    if "horas_docente" in campos:
        materia.horas_docente = payload.horas_docente
    if "horas_independientes" in campos:
        materia.horas_independientes = payload.horas_independientes
    if "instalaciones" in campos:
        materia.instalaciones = payload.instalaciones
        if "tipo_aula" not in campos and payload.instalaciones is not None:
            materia.tipo_aula = TipoAula(payload.instalaciones)
    if "tipo_aula" in campos:
        materia.tipo_aula = payload.tipo_aula
    if "modalidad" in campos:
        materia.modalidad = payload.modalidad
    if "tipo" in campos:
        materia.tipo = payload.tipo
    for campo in (
        "area_formacion", "aporte_sustancial", "docente_sugerido", "programa_asignatura",
        "usa_numeracion_romana", "es_capstone", "es_practica_profesional",
        "es_topico_selecto", "excepcion_horas_estandar", "ciclos_disponibles",
    ):
        if campo in campos:
            setattr(materia, campo, getattr(payload, campo))
    if "seriacion_materia_id" in campos:
        _validar_seriacion(db, materia.plan_curricular_id, payload.seriacion_materia_id)
        materia.seriacion_materia_id = payload.seriacion_materia_id
    if "activa" in campos:
        materia.activa = payload.activa

    audit_meta = {
        "accion": "materia_modificada",
        "datos_antes": datos_antes,
        "datos_despues": {
            campo: _serializar(getattr(materia, campo)) for campo in campos & auditables
        },
    }
    return _validar_y_confirmar(
        db, materia.plan_curricular_id, materia, actor_id=actor_id, audit_meta=audit_meta
    )


def delete_materia(db: Session, materia_id: int, *, actor_id: int | None = None) -> None:
    materia = get_materia(db, materia_id)
    materia_repo.delete(db, materia)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="materia_eliminada",
        entidad="materia",
        entidad_id=materia.id,
        carrera_id=materia.plan_curricular.carrera_id,
        plan_curricular_id=materia.plan_curricular_id,
        datos_antes={"clave": materia.clave, "nombre": materia.nombre},
    )
    db.commit()


def _validar_y_confirmar(
    db: Session,
    plan_id: int,
    materia: Materia,
    *,
    actor_id: int | None = None,
    audit_meta: dict | None = None,
) -> tuple[Materia, list[dict]]:
    db.flush()
    ctx = build_context(db, plan_id, operacion="materia")
    violaciones = _motor.evaluate(ctx, scope=RuleScope.MATERIA)
    errores = [v for v in violaciones if v.severity == Severity.ERROR]
    if errores:
        db.rollback()
        raise BusinessRuleError(
            "La materia no cumple las reglas de negocio",
            violations=[v.to_dict() for v in errores],
        )
    if audit_meta:
        audit.registrar(
            db,
            usuario_id=actor_id,
            entidad="materia",
            entidad_id=materia.id,
            carrera_id=materia.plan_curricular.carrera_id,
            plan_curricular_id=plan_id,
            **audit_meta,
        )
    db.commit()
    db.refresh(materia)
    warnings = [v.to_dict() for v in violaciones if v.severity == Severity.WARNING]
    return materia, warnings


def _validar_seriacion(db: Session, plan_id: int, seriacion_id: int | None) -> None:
    if seriacion_id is None:
        return
    prerequisito = materia_repo.get_by_id(db, seriacion_id)
    if prerequisito is None:
        raise NotFoundError("Materia de seriación no encontrada")
    if prerequisito.plan_curricular_id != plan_id:
        raise BusinessRuleError("La seriación debe pertenecer al mismo plan curricular")


def _serializar(valor):
    if hasattr(valor, "value"):
        return valor.value
    if isinstance(valor, list):
        return list(valor)
    return valor
