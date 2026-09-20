"""Creación, edición, validación y clonado transaccional de planes."""
from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.repositories import plan_curricular as plan_repo
from app.rules.context import build_context
from app.rules.registry import crear_motor
from app.schemas.plan_curricular import (
    ConfiguracionReglasCreate,
    PlanCurricularCreate,
    PlanCurricularUpdate,
    PlanDuplicarRequest,
)
from app.services import audit
from app.services import configuracion_reglas as config_service

_motor = crear_motor()


def list_planes(db: Session, carrera_id: int) -> list[PlanCurricular]:
    return plan_repo.list_by_carrera(db, carrera_id)


def get_plan(db: Session, plan_id: int) -> PlanCurricular:
    plan = plan_repo.get_by_id(db, plan_id)
    if plan is None:
        raise NotFoundError("Plan curricular no encontrado")
    return plan


def create_plan(
    db: Session, carrera_id: int, payload: PlanCurricularCreate, *, actor_id: int | None = None
) -> PlanCurricular:
    _asegurar_clave_disponible(db, payload.clave)
    plan = PlanCurricular(carrera_id=carrera_id, **payload.model_dump())
    plan_repo.add(db, plan)
    config_service.crear_inicial(db, plan)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="plan_creado",
        entidad="plan_curricular",
        entidad_id=plan.id,
        carrera_id=carrera_id,
        plan_curricular_id=plan.id,
        datos_despues={"clave": plan.clave, "estado": plan.estado.value},
    )
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(
    db: Session,
    plan_id: int,
    payload: PlanCurricularUpdate,
    *,
    actor_id: int | None = None,
) -> PlanCurricular:
    plan = get_plan(db, plan_id)
    campos = payload.model_fields_set
    if "clave" in campos and payload.clave != plan.clave:
        _asegurar_clave_disponible(db, payload.clave)

    for requerido in ("clave", "estado", "max_creditos_semestre"):
        if requerido in campos and getattr(payload, requerido) is None:
            raise BusinessRuleError(f"{requerido} no puede ser nulo")

    antes = {campo: _serializar(getattr(plan, campo)) for campo in campos}
    for campo in campos:
        setattr(plan, campo, getattr(payload, campo))
    if "decanato" in campos and plan.decanato.value != "OTRO" and "decanato_otro" not in campos:
        plan.decanato_otro = None
    if "decanato" in campos and plan.decanato.value == "OTRO" and not plan.decanato_otro:
        plan.decanato_otro = "No especificado"
    if plan.vigente_desde and plan.vigente_hasta and plan.vigente_hasta < plan.vigente_desde:
        raise BusinessRuleError("vigente_hasta no puede ser anterior a vigente_desde")

    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="plan_modificado",
        entidad="plan_curricular",
        entidad_id=plan.id,
        carrera_id=plan.carrera_id,
        plan_curricular_id=plan.id,
        datos_antes=antes,
        datos_despues={campo: _serializar(getattr(plan, campo)) for campo in campos},
    )
    campos_estructura = {"nivel_academico", "modalidad", "decanato"}
    if campos & (campos_estructura | {"max_creditos_semestre"}):
        cambios_config = {}
        if "max_creditos_semestre" in campos:
            cambios_config["max_creditos_ciclo"] = plan.max_creditos_semestre
        config_service.crear_version(
            db,
            plan,
            ConfiguracionReglasCreate(**cambios_config),
            actor_id=actor_id,
            usar_predeterminados=bool(campos & campos_estructura),
        )
        db.refresh(plan)
        return plan
    db.commit()
    db.refresh(plan)
    return plan


def validar_plan(db: Session, plan_id: int) -> list[dict]:
    get_plan(db, plan_id)
    return [v.to_dict() for v in _motor.evaluate(build_context(db, plan_id, operacion="validar"))]


def recalcular_claves(db: Session, plan_id: int, *, actor_id: int | None = None) -> list[Materia]:
    """Renumeración explícita, transaccional y auditada según el orden del mapa.

    Los espacios optativos se omiten y no consumen posición. Reordenar el mapa
    nunca cambia claves automáticamente; esta operación es la única vía.
    """
    plan = plan_repo.get_by_id(db, plan_id, con_estructura=True)
    if plan is None:
        raise NotFoundError("Plan curricular no encontrado")
    posicionados = [
        (elemento.orden, semestre.numero, elemento)
        for semestre in plan.semestres
        for elemento in semestre.elementos
    ]
    ordenadas = [
        elemento.materia
        for _, _, elemento in sorted(posicionados, key=lambda item: (item[0], item[1]))
        if elemento.materia_id is not None and elemento.materia is not None
    ]
    destinos = {materia.id: f"{plan.mnemonico}{posicion:03d}" for posicion, materia in enumerate(ordenadas, 1)}
    claves_destino = set(destinos.values())
    conflicto = next((m for m in plan.materias if m.id not in destinos and m.clave in claves_destino), None)
    if conflicto is not None:
        raise ConflictError(f"La clave destino {conflicto.clave} ya pertenece a una materia fuera del mapa")
    anteriores = {m.id: m.clave for m in ordenadas}
    try:
        existentes = {m.clave for m in plan.materias}
        for materia in ordenadas:
            temporal = uuid4().hex[:20].upper()
            while temporal in existentes:
                temporal = uuid4().hex[:20].upper()
            existentes.add(temporal)
            materia.clave = temporal
        db.flush()
        for materia in ordenadas:
            materia.clave = destinos[materia.id]
            if anteriores[materia.id] != materia.clave:
                audit.registrar(db, usuario_id=actor_id, accion="clave_materia_recalculada", entidad="materia", entidad_id=materia.id, carrera_id=plan.carrera_id, plan_curricular_id=plan.id, datos_antes={"clave": anteriores[materia.id]}, datos_despues={"clave": materia.clave})
        db.commit()
        return ordenadas
    except Exception:
        db.rollback()
        raise


def duplicar_plan(
    db: Session,
    plan_id: int,
    payload: PlanDuplicarRequest,
    *,
    actor_id: int | None = None,
) -> PlanCurricular:
    origen = plan_repo.get_by_id(db, plan_id, con_estructura=True)
    if origen is None:
        raise NotFoundError("Plan curricular no encontrado")
    _asegurar_clave_disponible(db, payload.clave)

    try:
        nuevo = PlanCurricular(
            carrera_id=origen.carrera_id,
            clave=payload.clave,
            descripcion=payload.descripcion,
            anio_inicio=payload.anio_inicio,
            vigente_desde=payload.vigente_desde,
            vigente_hasta=payload.vigente_hasta,
            estado=payload.estado,
            max_creditos_semestre=origen.max_creditos_semestre,
            nivel_academico=origen.nivel_academico,
            modalidad=origen.modalidad,
            decanato=origen.decanato,
            decanato_otro=origen.decanato_otro,
            tipo_reconocimiento=origen.tipo_reconocimiento,
            mnemonico=origen.mnemonico,
            texto_administrativo_flexible=origen.texto_administrativo_flexible,
        )
        plan_repo.add(db, nuevo)

        config_origen = next((c for c in reversed(origen.configuraciones_reglas) if c.vigente), None)
        if config_origen is None:
            config_service.crear_inicial(db, nuevo)
        else:
            from app.models.configuracion_reglas import ConfiguracionReglasPlan
            valores_config = {
                columna.name: getattr(config_origen, columna.name)
                for columna in ConfiguracionReglasPlan.__table__.columns
                if columna.name not in {"id", "plan_curricular_id", "created_at", "updated_at", "vigente_desde"}
            }
            db.add(ConfiguracionReglasPlan(plan_curricular_id=nuevo.id, **valores_config))

        materia_ids: dict[int, int] = {}
        materias_nuevas: dict[int, Materia] = {}
        for materia in sorted(origen.materias, key=lambda m: m.id):
            clon = Materia(
                plan_curricular_id=nuevo.id,
                clave=materia.clave,
                nombre=materia.nombre,
                horas_docente=materia.horas_docente,
                horas_independientes=materia.horas_independientes,
                instalaciones=materia.instalaciones,
                tipo_aula=materia.tipo_aula,
                modalidad=materia.modalidad,
                area_formacion=materia.area_formacion,
                aporte_sustancial=materia.aporte_sustancial,
                docente_sugerido=materia.docente_sugerido,
                programa_asignatura=materia.programa_asignatura,
                usa_numeracion_romana=materia.usa_numeracion_romana,
                es_capstone=materia.es_capstone,
                es_practica_profesional=materia.es_practica_profesional,
                es_topico_selecto=materia.es_topico_selecto,
                excepcion_horas_estandar=materia.excepcion_horas_estandar,
                ciclos_disponibles=list(materia.ciclos_disponibles or []),
                tipo=materia.tipo,
                activa=materia.activa,
            )
            db.add(clon)
            db.flush()
            materia_ids[materia.id] = clon.id
            materias_nuevas[materia.id] = clon
        for materia in origen.materias:
            if materia.seriacion_materia_id is not None:
                materias_nuevas[materia.id].seriacion_materia_id = materia_ids[
                    materia.seriacion_materia_id
                ]

        semestre_ids: dict[int, int] = {}
        for semestre in origen.semestres:
            clon = Semestre(plan_curricular_id=nuevo.id, numero=semestre.numero)
            db.add(clon)
            db.flush()
            semestre_ids[semestre.id] = clon.id

        for semestre in origen.semestres:
            for elemento in semestre.elementos:
                db.add(
                    SemestreElemento(
                        semestre_id=semestre_ids[semestre.id],
                        tipo=elemento.tipo,
                        orden=elemento.orden,
                        materia_id=(
                            materia_ids[elemento.materia_id]
                            if elemento.materia_id is not None
                            else None
                        ),
                        nombre=elemento.nombre,
                        horas_docente=elemento.horas_docente,
                        horas_independientes=elemento.horas_independientes,
                    )
                )

        audit.registrar(
            db,
            usuario_id=actor_id,
            accion="plan_duplicado",
            entidad="plan_curricular",
            entidad_id=nuevo.id,
            carrera_id=nuevo.carrera_id,
            plan_curricular_id=nuevo.id,
            datos_antes={"plan_origen_id": origen.id},
            datos_despues={"clave": nuevo.clave},
        )
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception:
        db.rollback()
        raise


def _asegurar_clave_disponible(db: Session, clave: str | None) -> None:
    if clave is not None and plan_repo.get_by_clave(db, clave) is not None:
        raise ConflictError("Ya existe un plan curricular con esa clave")


def _serializar(valor):
    return valor.value if hasattr(valor, "value") else valor.isoformat() if hasattr(valor, "isoformat") else valor
