"""Autorización por recurso basada en asignaciones vigentes en la base de datos."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.enums import RolUsuario
from app.models.plan_curricular import PlanCurricular
from app.repositories import carrera as carrera_repo
from app.repositories import materia as materia_repo
from app.repositories import plan_curricular as plan_repo
from app.repositories import semestre as semestre_repo
from app.repositories import semestre_elemento as elemento_repo


def require_view_carrera(db: Session, principal: Principal, carrera_id: int) -> None:
    if carrera_repo.get_by_id(db, carrera_id) is None:
        raise NotFoundError("Carrera no encontrada")
    if principal.rol == RolUsuario.ADMIN:
        return
    if not carrera_repo.usuario_tiene_asignacion(db, principal.usuario_id, carrera_id):
        raise ForbiddenError("No tienes permiso para consultar información de esta carrera")


def require_edit_carrera(db: Session, principal: Principal, carrera_id: int) -> None:
    if principal.rol == RolUsuario.ADMIN:
        return
    if principal.rol == RolUsuario.DIRECTOR and carrera_repo.usuario_tiene_asignacion(
        db, principal.usuario_id, carrera_id
    ):
        return
    raise ForbiddenError("No tienes permiso para modificar esta carrera")


def require_view_plan(db: Session, principal: Principal, plan_id: int) -> PlanCurricular:
    plan = _get_plan(db, plan_id)
    require_view_carrera(db, principal, plan.carrera_id)
    return plan


def require_edit_plan(db: Session, principal: Principal, plan_id: int) -> PlanCurricular:
    plan = _get_plan(db, plan_id)
    require_edit_carrera(db, principal, plan.carrera_id)
    return plan


def resolve_plan_from_materia(db: Session, materia_id: int) -> int:
    materia = materia_repo.get_by_id(db, materia_id)
    if materia is None:
        raise NotFoundError("Materia no encontrada")
    return materia.plan_curricular_id


def resolve_plan_from_semestre(db: Session, semestre_id: int) -> int:
    semestre = semestre_repo.get_by_id(db, semestre_id)
    if semestre is None:
        raise NotFoundError("Semestre no encontrado")
    return semestre.plan_curricular_id


def resolve_plan_from_elemento(db: Session, elemento_id: int) -> int:
    elemento = elemento_repo.get_by_id(db, elemento_id)
    if elemento is None:
        raise NotFoundError("Elemento no encontrado")
    return resolve_plan_from_semestre(db, elemento.semestre_id)


def _get_plan(db: Session, plan_id: int) -> PlanCurricular:
    plan = plan_repo.get_by_id(db, plan_id)
    if plan is None:
        raise NotFoundError("Plan curricular no encontrado")
    return plan
