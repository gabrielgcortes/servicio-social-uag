"""Acceso a datos de PlanCurricular."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre


def get_by_id(db: Session, plan_id: int, *, con_estructura: bool = False) -> PlanCurricular | None:
    if not con_estructura:
        return db.get(PlanCurricular, plan_id)
    stmt = (
        select(PlanCurricular)
        .where(PlanCurricular.id == plan_id)
        .options(
            selectinload(PlanCurricular.materias),
            selectinload(PlanCurricular.semestres)
            .selectinload(Semestre.elementos),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def get_by_clave(db: Session, clave: str) -> PlanCurricular | None:
    return db.execute(
        select(PlanCurricular).where(PlanCurricular.clave == clave)
    ).scalar_one_or_none()


def list_by_carrera(db: Session, carrera_id: int) -> list[PlanCurricular]:
    stmt = (
        select(PlanCurricular)
        .where(PlanCurricular.carrera_id == carrera_id)
        .order_by(PlanCurricular.anio_inicio.desc().nullslast(), PlanCurricular.clave)
    )
    return list(db.execute(stmt).scalars())


def add(db: Session, plan: PlanCurricular) -> PlanCurricular:
    db.add(plan)
    db.flush()
    return plan
