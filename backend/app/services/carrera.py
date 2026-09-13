"""Reglas de negocio de Carrera. La autorización por recurso ya se validó en
el router (auth.policies) antes de invocar estos servicios."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.carrera import Carrera
from app.models.enums import RolUsuario
from app.repositories import carrera as carrera_repo
from app.rules.context import build_context
from app.rules.registry import crear_motor
from app.schemas.carrera import CarreraCreate, CarreraUpdate
from app.services import audit

_CAMPOS_SOLO_ADMIN = {"clave", "max_creditos_semestre", "activa"}
_motor = crear_motor()


def list_carreras_for_principal(db: Session, principal: Principal) -> list[Carrera]:
    if principal.rol == RolUsuario.ADMIN:
        return carrera_repo.list_all(db)
    if principal.carrera_id is None:
        return []
    carrera = carrera_repo.get_by_id(db, principal.carrera_id)
    return [carrera] if carrera else []


def get_carrera(db: Session, carrera_id: int) -> Carrera:
    carrera = carrera_repo.get_by_id(db, carrera_id)
    if carrera is None:
        raise NotFoundError("Carrera no encontrada")
    return carrera


def create_carrera(db: Session, payload: CarreraCreate, *, actor_id: int | None = None) -> Carrera:
    if carrera_repo.get_by_clave(db, payload.clave) is not None:
        raise ConflictError("Ya existe una carrera con esa clave")
    carrera = Carrera(
        clave=payload.clave,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        max_creditos_semestre=payload.max_creditos_semestre,
    )
    carrera_repo.add(db, carrera)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="carrera_creada",
        entidad="carrera",
        entidad_id=carrera.id,
        carrera_id=carrera.id,
        datos_despues={"clave": carrera.clave, "nombre": carrera.nombre},
    )
    db.commit()
    db.refresh(carrera)
    return carrera


def update_carrera(
    db: Session,
    carrera_id: int,
    payload: CarreraUpdate,
    *,
    es_admin: bool,
    actor_id: int | None = None,
) -> Carrera:
    carrera = get_carrera(db, carrera_id)
    campos = payload.model_fields_set

    if not es_admin and campos & _CAMPOS_SOLO_ADMIN:
        raise ForbiddenError(
            "Solo ADMIN puede modificar clave, max_creditos_semestre o activa"
        )

    datos_antes = {
        "clave": carrera.clave,
        "nombre": carrera.nombre,
        "max_creditos_semestre": carrera.max_creditos_semestre,
    }

    if "clave" in campos and payload.clave != carrera.clave:
        if carrera_repo.get_by_clave(db, payload.clave) is not None:
            raise ConflictError("Ya existe una carrera con esa clave")
        carrera.clave = payload.clave
    if "nombre" in campos:
        carrera.nombre = payload.nombre
    if "descripcion" in campos:
        carrera.descripcion = payload.descripcion
    if "max_creditos_semestre" in campos:
        carrera.max_creditos_semestre = payload.max_creditos_semestre
    if "activa" in campos:
        carrera.activa = payload.activa

    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="carrera_modificada",
        entidad="carrera",
        entidad_id=carrera.id,
        carrera_id=carrera.id,
        datos_antes=datos_antes,
        datos_despues={
            "clave": carrera.clave,
            "nombre": carrera.nombre,
            "max_creditos_semestre": carrera.max_creditos_semestre,
        },
    )
    db.commit()
    db.refresh(carrera)
    return carrera


def deactivate_carrera(db: Session, carrera_id: int, *, actor_id: int | None = None) -> Carrera:
    carrera = get_carrera(db, carrera_id)
    carrera.activa = False
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="carrera_desactivada",
        entidad="carrera",
        entidad_id=carrera.id,
        carrera_id=carrera.id,
    )
    db.commit()
    db.refresh(carrera)
    return carrera


def validar_carrera(db: Session, carrera_id: int) -> list[dict]:
    """Corre todas las reglas sin mutar nada; útil para la UI antes de guardar."""
    get_carrera(db, carrera_id)  # 404 si no existe
    ctx = build_context(db, carrera_id, operacion="validar")
    violaciones = _motor.evaluate(ctx)
    return [v.to_dict() for v in violaciones]
