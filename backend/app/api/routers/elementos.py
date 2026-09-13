"""Endpoints del mapa curricular: alta/baja de elementos (materia o espacio
optativo), reordenado dentro de un semestre y movimiento entre semestres."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import policies
from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.db.session import get_db
from app.schemas.elemento import (
    ElementoCreate,
    ElementoEspacioOptativoCreate,
    ElementoMateriaCreate,
    ElementoMutationResponse,
    ElementoRead,
    EspacioOptativoUpdate,
    MoverElementoRequest,
    ReordenarRequest,
)
from app.services import elemento as elemento_service

router = APIRouter(tags=["elementos"])


@router.get("/api/semestres/{semestre_id}/elementos", response_model=list[ElementoRead])
def list_elementos(
    semestre_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[ElementoRead]:
    carrera_id = policies.resolve_carrera_from_semestre(db, semestre_id)
    policies.require_view_carrera(principal, carrera_id)
    elementos = elemento_service.list_elementos(db, semestre_id)
    return [ElementoRead.model_validate(e) for e in elementos]


@router.post(
    "/api/semestres/{semestre_id}/elementos",
    response_model=ElementoMutationResponse,
    status_code=201,
)
def create_elemento(
    semestre_id: int,
    payload: ElementoCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ElementoMutationResponse:
    carrera_id = policies.resolve_carrera_from_semestre(db, semestre_id)
    policies.require_edit_carrera(principal, carrera_id)

    if isinstance(payload, ElementoMateriaCreate):
        elemento, warnings = elemento_service.crear_elemento_materia(db, semestre_id, payload)
    else:
        assert isinstance(payload, ElementoEspacioOptativoCreate)
        elemento, warnings = elemento_service.crear_espacio_optativo(db, semestre_id, payload)

    return ElementoMutationResponse(
        elemento=ElementoRead.model_validate(elemento), warnings=warnings
    )


@router.patch("/api/elementos/{elemento_id}", response_model=ElementoMutationResponse)
def update_elemento(
    elemento_id: int,
    payload: EspacioOptativoUpdate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ElementoMutationResponse:
    carrera_id = policies.resolve_carrera_from_elemento(db, elemento_id)
    policies.require_edit_carrera(principal, carrera_id)
    elemento, warnings = elemento_service.actualizar_espacio_optativo(db, elemento_id, payload)
    return ElementoMutationResponse(
        elemento=ElementoRead.model_validate(elemento), warnings=warnings
    )


@router.delete("/api/elementos/{elemento_id}", status_code=204, response_model=None)
def delete_elemento(
    elemento_id: int,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> None:
    carrera_id = policies.resolve_carrera_from_elemento(db, elemento_id)
    policies.require_edit_carrera(principal, carrera_id)
    elemento_service.eliminar_elemento(db, elemento_id, actor_id=principal.usuario_id)


@router.put("/api/semestres/{semestre_id}/elementos/orden", response_model=list[ElementoRead])
def reordenar_elementos(
    semestre_id: int,
    payload: ReordenarRequest,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[ElementoRead]:
    carrera_id = policies.resolve_carrera_from_semestre(db, semestre_id)
    policies.require_edit_carrera(principal, carrera_id)
    elementos = elemento_service.reordenar(db, semestre_id, payload.elemento_ids)
    return [ElementoRead.model_validate(e) for e in elementos]


@router.post("/api/elementos/{elemento_id}/mover", response_model=ElementoMutationResponse)
def mover_elemento(
    elemento_id: int,
    payload: MoverElementoRequest,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ElementoMutationResponse:
    carrera_id_origen = policies.resolve_carrera_from_elemento(db, elemento_id)
    carrera_id_destino = policies.resolve_carrera_from_semestre(db, payload.semestre_destino_id)
    policies.require_edit_carrera(principal, carrera_id_origen)
    policies.require_edit_carrera(principal, carrera_id_destino)

    elemento, warnings = elemento_service.mover_elemento(
        db, elemento_id, payload.semestre_destino_id, payload.posicion, actor_id=principal.usuario_id
    )
    return ElementoMutationResponse(
        elemento=ElementoRead.model_validate(elemento), warnings=warnings
    )
