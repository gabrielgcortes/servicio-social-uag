"""Reglas de negocio de SemestreElemento: alta/baja de materias y espacios
optativos del mapa, reordenado y movimiento entre semestres. Valida con el
RuleEngine (scope SEMESTRE, principalmente MAX_CREDITOS_SEMESTRE) antes de
confirmar; en errores de reordenado/movimiento no se persiste nada."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.enums import TipoElemento, TipoMateria
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.repositories import materia as materia_repo
from app.repositories import semestre as semestre_repo
from app.repositories import semestre_elemento as elemento_repo
from app.rules.base import RuleScope, Severity
from app.rules.context import build_context
from app.rules.registry import crear_motor
from app.schemas.elemento import (
    ElementoEspacioOptativoCreate,
    ElementoMateriaCreate,
    EspacioOptativoUpdate,
)
from app.services import audit

_motor = crear_motor()


def list_elementos(db: Session, semestre_id: int) -> list[SemestreElemento]:
    return elemento_repo.list_by_semestre(db, semestre_id)


def get_elemento(db: Session, elemento_id: int) -> SemestreElemento:
    elemento = elemento_repo.get_by_id(db, elemento_id)
    if elemento is None:
        raise NotFoundError("Elemento no encontrado")
    return elemento


def crear_elemento_materia(
    db: Session,
    semestre_id: int,
    payload: ElementoMateriaCreate,
    *,
    actor_id: int | None = None,
) -> tuple[SemestreElemento, list[dict]]:
    semestre = _get_semestre(db, semestre_id)
    materia = materia_repo.get_by_id(db, payload.materia_id)
    if materia is None:
        raise NotFoundError("Materia no encontrada")
    if materia.plan_curricular_id != semestre.plan_curricular_id:
        raise BusinessRuleError("La materia no pertenece al mismo plan curricular")
    if materia.tipo != TipoMateria.OBLIGATORIA:
        raise BusinessRuleError(
            "Una materia optativa no puede colocarse directamente en el mapa; "
            "usa un espacio optativo",
            violations=[
                {
                    "code": "OPTATIVA_NO_EN_MAPA",
                    "severity": "ERROR",
                    "message": "Las materias optativas no van directo al mapa",
                    "context": {"materia_id": materia.id},
                }
            ],
        )
    if elemento_repo.get_by_materia(db, materia.id) is not None:
        raise BusinessRuleError(
            "Esta materia ya está colocada en el mapa curricular",
            violations=[
                {
                    "code": "MATERIA_YA_EN_MAPA",
                    "severity": "ERROR",
                    "message": "La materia ya está en el mapa",
                    "context": {"materia_id": materia.id},
                }
            ],
        )

    elemento = SemestreElemento(
        semestre_id=semestre_id,
        tipo=TipoElemento.MATERIA,
        materia_id=materia.id,
        orden=elemento_repo.siguiente_orden(db, semestre_id),
    )
    elemento_repo.add(db, elemento)
    return _validar_y_confirmar(
        db,
        semestre.plan_curricular_id,
        elemento,
        actor_id=actor_id,
        audit_meta={"accion": "elemento_creado", "datos_despues": {"materia_id": materia.id}},
    )


def crear_espacio_optativo(
    db: Session,
    semestre_id: int,
    payload: ElementoEspacioOptativoCreate,
    *,
    actor_id: int | None = None,
) -> tuple[SemestreElemento, list[dict]]:
    semestre = _get_semestre(db, semestre_id)
    elemento = SemestreElemento(
        semestre_id=semestre_id,
        tipo=TipoElemento.ESPACIO_OPTATIVO,
        nombre=payload.nombre,
        horas_docente=payload.horas_docente,
        horas_independientes=payload.horas_independientes,
        orden=elemento_repo.siguiente_orden(db, semestre_id),
    )
    elemento_repo.add(db, elemento)
    return _validar_y_confirmar(
        db,
        semestre.plan_curricular_id,
        elemento,
        actor_id=actor_id,
        audit_meta={"accion": "elemento_creado", "datos_despues": {"nombre": elemento.nombre}},
    )


def actualizar_espacio_optativo(
    db: Session,
    elemento_id: int,
    payload: EspacioOptativoUpdate,
    *,
    actor_id: int | None = None,
) -> tuple[SemestreElemento, list[dict]]:
    elemento = get_elemento(db, elemento_id)
    if elemento.tipo != TipoElemento.ESPACIO_OPTATIVO:
        raise BusinessRuleError("Solo los espacios optativos se editan por esta vía")

    campos = payload.model_fields_set
    if "nombre" in campos:
        elemento.nombre = payload.nombre
    if "horas_docente" in campos:
        elemento.horas_docente = payload.horas_docente
    if "horas_independientes" in campos:
        elemento.horas_independientes = payload.horas_independientes

    semestre = _get_semestre(db, elemento.semestre_id)
    return _validar_y_confirmar(
        db,
        semestre.plan_curricular_id,
        elemento,
        actor_id=actor_id,
        audit_meta={"accion": "elemento_modificado"},
    )


def eliminar_elemento(db: Session, elemento_id: int, *, actor_id: int | None = None) -> None:
    elemento = get_elemento(db, elemento_id)
    semestre = _get_semestre(db, elemento.semestre_id)
    elemento_repo.delete(db, elemento)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="elemento_eliminado",
        entidad="semestre_elemento",
        entidad_id=elemento.id,
        carrera_id=semestre.plan_curricular.carrera_id,
        plan_curricular_id=semestre.plan_curricular_id,
        datos_antes={"tipo": elemento.tipo.value, "materia_id": elemento.materia_id},
    )
    db.commit()


def reordenar(
    db: Session, semestre_id: int, elemento_ids: list[int], *, actor_id: int | None = None
) -> list[SemestreElemento]:
    semestre = _get_semestre(db, semestre_id)
    actuales = elemento_repo.list_by_semestre(db, semestre_id)
    if {e.id for e in actuales} != set(elemento_ids) or len(elemento_ids) != len(actuales):
        raise BusinessRuleError(
            "La lista de elementos no coincide exactamente con el contenido del semestre"
        )

    por_id = {e.id: e for e in actuales}
    for orden, elemento_id_ in enumerate(elemento_ids):
        por_id[elemento_id_].orden = orden

    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="elementos_reordenados",
        entidad="semestre",
        entidad_id=semestre.id,
        carrera_id=semestre.plan_curricular.carrera_id,
        plan_curricular_id=semestre.plan_curricular_id,
        datos_despues={"elemento_ids": elemento_ids},
    )
    db.commit()
    return elemento_repo.list_by_semestre(db, semestre_id)


def mover_elemento(
    db: Session,
    elemento_id: int,
    semestre_destino_id: int,
    posicion: int,
    *,
    actor_id: int | None = None,
) -> tuple[SemestreElemento, list[dict]]:
    elemento = get_elemento(db, elemento_id)
    semestre_origen = _get_semestre(db, elemento.semestre_id)
    semestre_destino = _get_semestre(db, semestre_destino_id)

    if semestre_origen.plan_curricular_id != semestre_destino.plan_curricular_id:
        raise BusinessRuleError("No se puede mover un elemento a otro plan curricular")
    if semestre_origen.id == semestre_destino.id:
        raise BusinessRuleError(
            "Para reordenar dentro del mismo semestre usa el endpoint de reordenado"
        )

    origen_restantes = [
        e for e in elemento_repo.list_by_semestre(db, semestre_origen.id) if e.id != elemento.id
    ]
    for orden, e in enumerate(origen_restantes):
        e.orden = orden

    destino_actuales = elemento_repo.list_by_semestre(db, semestre_destino.id)
    posicion = max(0, min(posicion, len(destino_actuales)))
    destino_actuales.insert(posicion, elemento)
    elemento.semestre_id = semestre_destino.id
    for orden, e in enumerate(destino_actuales):
        e.orden = orden

    audit_meta = {
        "accion": "materia_movida",
        "datos_antes": {"semestre_id": semestre_origen.id, "semestre_numero": semestre_origen.numero},
        "datos_despues": {"semestre_id": semestre_destino.id, "semestre_numero": semestre_destino.numero},
    }
    return _validar_y_confirmar(
        db, semestre_destino.plan_curricular_id, elemento, actor_id=actor_id, audit_meta=audit_meta
    )


def _get_semestre(db: Session, semestre_id: int) -> Semestre:
    semestre = semestre_repo.get_by_id(db, semestre_id)
    if semestre is None:
        raise NotFoundError("Semestre no encontrado")
    return semestre


def _validar_y_confirmar(
    db: Session,
    plan_id: int,
    elemento: SemestreElemento,
    *,
    actor_id: int | None = None,
    audit_meta: dict | None = None,
) -> tuple[SemestreElemento, list[dict]]:
    db.flush()
    ctx = build_context(db, plan_id, operacion="elemento")
    violaciones = _motor.evaluate(ctx, scope=RuleScope.SEMESTRE)
    # Al colocar o mover materias ya se conoce su ciclo; aquí puede validarse
    # por primera vez que la seriación apunte realmente a un ciclo anterior.
    codigos_seriacion = {
        "SERIACION_MISMO_PLAN", "SERIACION_CICLO", "SERIACION_ORDEN_SEMESTRE",
        "SERIACION_PROHIBIDA", "SERIACION_NUMERACION_ROMANA", "SECUENCIA_DOCUMENTAL",
    }
    violaciones.extend(
        v for v in _motor.evaluate(ctx, scope=RuleScope.MATERIA) if v.code in codigos_seriacion
    )
    errores = [v for v in violaciones if v.severity == Severity.ERROR]
    if errores:
        db.rollback()
        raise BusinessRuleError(
            "El cambio no cumple las reglas de negocio",
            violations=[v.to_dict() for v in errores],
        )
    if audit_meta:
        audit.registrar(
            db,
            usuario_id=actor_id,
            entidad="semestre_elemento",
            entidad_id=elemento.id,
            carrera_id=ctx.plan.carrera_id,
            plan_curricular_id=plan_id,
            **audit_meta,
        )
    db.commit()
    db.refresh(elemento)
    warnings = [v.to_dict() for v in violaciones if v.severity == Severity.WARNING]
    return elemento, warnings
