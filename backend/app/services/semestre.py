"""Reglas de negocio de Semestre. La autorización de carrera ya se validó en
el router antes de invocar estos servicios."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.semestre import Semestre
from app.repositories import semestre as semestre_repo
from app.schemas.semestre import SemestreCreate
from app.services import audit


def list_semestres(db: Session, plan_id: int) -> list[Semestre]:
    return semestre_repo.list_by_plan(db, plan_id)


def get_semestre(db: Session, semestre_id: int) -> Semestre:
    semestre = semestre_repo.get_by_id(db, semestre_id)
    if semestre is None:
        raise NotFoundError("Semestre no encontrado")
    return semestre


def create_semestre(
    db: Session, plan_id: int, payload: SemestreCreate, *, actor_id: int | None = None
) -> Semestre:
    numero = (
        payload.numero
        if payload.numero is not None
        else semestre_repo.siguiente_numero_libre(db, plan_id)
    )
    if semestre_repo.get_by_plan_numero(db, plan_id, numero) is not None:
        raise ConflictError(f"Ya existe el semestre {numero} en este plan")

    semestre = Semestre(plan_curricular_id=plan_id, numero=numero)
    semestre_repo.add(db, semestre)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="semestre_creado",
        entidad="semestre",
        entidad_id=semestre.id,
        carrera_id=semestre.plan_curricular.carrera_id,
        plan_curricular_id=plan_id,
        datos_despues={"numero": numero},
    )
    db.commit()
    db.refresh(semestre)
    return semestre


def delete_semestre(
    db: Session, semestre_id: int, *, force: bool = False, actor_id: int | None = None
) -> None:
    semestre = get_semestre(db, semestre_id)
    if not force and len(semestre.elementos) > 0:
        raise BusinessRuleError(
            "El semestre tiene materias/espacios asignados; usa force=true para forzar el borrado",
            violations=[
                {
                    "code": "SEMESTRE_NO_VACIO",
                    "severity": "ERROR",
                    "message": "El semestre no está vacío",
                    "context": {"semestre_id": semestre_id},
                }
            ],
        )
    plan_id = semestre.plan_curricular_id
    carrera_id = semestre.plan_curricular.carrera_id
    numero = semestre.numero
    semestre_repo.delete(db, semestre)
    audit.registrar(
        db,
        usuario_id=actor_id,
        accion="semestre_eliminado",
        entidad="semestre",
        entidad_id=semestre.id,
        carrera_id=carrera_id,
        plan_curricular_id=plan_id,
        datos_antes={"numero": numero},
    )
    db.commit()
