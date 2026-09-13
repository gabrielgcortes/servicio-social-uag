"""Reglas de negocio de Materia: valida con el RuleEngine antes de confirmar.
Si hay alguna violación ERROR se hace rollback y se lanza BusinessRuleError;
las WARNING se devuelven junto con la materia sin bloquear la operación."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.enums import TipoMateria
from app.models.materia import Materia
from app.repositories import materia as materia_repo
from app.rules.base import RuleScope, Severity
from app.rules.context import build_context
from app.rules.registry import crear_motor
from app.schemas.materia import MateriaCreate, MateriaUpdate
from app.services import audit

_motor = crear_motor()


def list_materias(
    db: Session, carrera_id: int, *, tipo: TipoMateria | None = None
) -> list[Materia]:
    return materia_repo.list_by_carrera(db, carrera_id, tipo=tipo)


def get_materia(db: Session, materia_id: int) -> Materia:
    materia = materia_repo.get_by_id(db, materia_id)
    if materia is None:
        raise NotFoundError("Materia no encontrada")
    return materia


def create_materia(
    db: Session, carrera_id: int, payload: MateriaCreate, *, actor_id: int | None = None
) -> tuple[Materia, list[dict]]:
    if materia_repo.get_by_carrera_clave(db, carrera_id, payload.clave) is not None:
        raise ConflictError("Ya existe una materia con esa clave en esta carrera")

    materia = Materia(
        carrera_id=carrera_id,
        clave=payload.clave,
        nombre=payload.nombre,
        horas_docente=payload.horas_docente,
        horas_independientes=payload.horas_independientes,
        instalaciones=payload.instalaciones,
        modalidad=payload.modalidad,
        tipo=payload.tipo,
        seriacion_materia_id=payload.seriacion_materia_id,
        activa=payload.activa,
    )
    materia_repo.add(db, materia)
    audit_meta = {
        "accion": "materia_creada",
        "datos_despues": {"clave": materia.clave, "nombre": materia.nombre},
    }
    return _validar_y_confirmar(db, carrera_id, materia, actor_id=actor_id, audit_meta=audit_meta)


def update_materia(
    db: Session, materia_id: int, payload: MateriaUpdate, *, actor_id: int | None = None
) -> tuple[Materia, list[dict]]:
    materia = get_materia(db, materia_id)
    campos = payload.model_fields_set
    datos_antes = {
        "horas_docente": materia.horas_docente,
        "horas_independientes": materia.horas_independientes,
    }

    if "clave" in campos and payload.clave != materia.clave:
        if materia_repo.get_by_carrera_clave(db, materia.carrera_id, payload.clave) is not None:
            raise ConflictError("Ya existe una materia con esa clave en esta carrera")
        materia.clave = payload.clave
    if "nombre" in campos:
        materia.nombre = payload.nombre
    if "horas_docente" in campos:
        materia.horas_docente = payload.horas_docente
    if "horas_independientes" in campos:
        materia.horas_independientes = payload.horas_independientes
    if "instalaciones" in campos:
        materia.instalaciones = payload.instalaciones
    if "modalidad" in campos:
        materia.modalidad = payload.modalidad
    if "tipo" in campos:
        materia.tipo = payload.tipo
    if "seriacion_materia_id" in campos:
        materia.seriacion_materia_id = payload.seriacion_materia_id
    if "activa" in campos:
        materia.activa = payload.activa

    audit_meta = {
        "accion": "materia_modificada",
        "datos_antes": datos_antes,
        "datos_despues": {
            "horas_docente": materia.horas_docente,
            "horas_independientes": materia.horas_independientes,
        },
    }
    return _validar_y_confirmar(
        db, materia.carrera_id, materia, actor_id=actor_id, audit_meta=audit_meta
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
        carrera_id=materia.carrera_id,
        datos_antes={"clave": materia.clave, "nombre": materia.nombre},
    )
    db.commit()


def _validar_y_confirmar(
    db: Session,
    carrera_id: int,
    materia: Materia,
    *,
    actor_id: int | None = None,
    audit_meta: dict | None = None,
) -> tuple[Materia, list[dict]]:
    db.flush()
    ctx = build_context(db, carrera_id, operacion="materia")
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
            carrera_id=carrera_id,
            **audit_meta,
        )
    db.commit()
    db.refresh(materia)
    warnings = [v.to_dict() for v in violaciones if v.severity == Severity.WARNING]
    return materia, warnings
