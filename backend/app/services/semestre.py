"""Reglas de negocio de Semestre. La autorización de carrera ya se validó en
el router antes de invocar estos servicios."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.semestre import Semestre
from app.repositories import semestre as semestre_repo
from app.schemas.semestre import SemestreCreate


def list_semestres(db: Session, carrera_id: int) -> list[Semestre]:
    return semestre_repo.list_by_carrera(db, carrera_id)


def get_semestre(db: Session, semestre_id: int) -> Semestre:
    semestre = semestre_repo.get_by_id(db, semestre_id)
    if semestre is None:
        raise NotFoundError("Semestre no encontrado")
    return semestre


def create_semestre(db: Session, carrera_id: int, payload: SemestreCreate) -> Semestre:
    numero = (
        payload.numero
        if payload.numero is not None
        else semestre_repo.siguiente_numero_libre(db, carrera_id)
    )
    if semestre_repo.get_by_carrera_numero(db, carrera_id, numero) is not None:
        raise ConflictError(f"Ya existe el semestre {numero} en esta carrera")

    semestre = Semestre(carrera_id=carrera_id, numero=numero)
    semestre_repo.add(db, semestre)
    db.commit()
    db.refresh(semestre)
    return semestre


def delete_semestre(db: Session, semestre_id: int, *, force: bool = False) -> None:
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
    semestre_repo.delete(db, semestre)
    db.commit()
